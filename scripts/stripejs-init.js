;(function(){

    // ECMAScript5 compatible
    // @author: benbyford


    // document els
    var cardholderName = document.getElementById('cardholder-name');
    var cardButton = document.getElementById('card-button');
    var form = document.getElementById('stripe-payment-form');
    
    var handleWithAjax = Number(form.dataset.ajax);
    console.log(handleWithAjax);
    

    var clientSecret = cardButton.dataset.secret;
    var publicKey = cardButton.dataset.public;

    // init Stripe
    var stripe = Stripe(publicKey);
    var elements = stripe.elements();

    // Stripe elements
    var elementsStyle = {};
    if(window.hasOwnProperty( "style" )){
        elementsStyle = style;
    }

    var cardElement = elements.create('card', {
        iconStyle: 'solid',
        // add style from module settings page
        style: elementsStyle
    });
    // apply form to the page
    cardElement.mount('#card-element');

    // syntax for iban payments
    // var cardElement = elements.create('iban', {supportedCountries:['SEPA']});



    // 
    // add cross browser payments button
    // https://stripe.com/docs/stripe-js/elements/payment-request-button
    // https://stripe.com/docs/stripe-js/reference#the-payment-request-object

    //
    // var paymentRequest = stripe.paymentRequest({
    //     country: 'US',
    //     currency: 'gbp',
    //     total: {
    //     label: 'Demo total',
    //     amount: 1000,
    //     },
    //     requestPayerName: true,
    //     requestPayerEmail: true,
    // });

    // // Stripe elements payment request button + styling
    // var prButton = elements.create('paymentRequestButton', {
    //     paymentRequest: paymentRequest,
    //     style: {
    //         paymentRequestButton: {
    //         height: '56px', // default: '40px', the width is always '100%'
    //         },
    //     },
    // });

    // Check the availability of the Payment Request API first.
    // paymentRequest.canMakePayment().then(function(result) {
    //     if (result) {
    //         prButton.mount('#payment-request-button');
    //     } else {
    //         crossBrowserPaymentButton = document.getElementById('#payment-request-button');
    //         if(crossBrowserPaymentButton) crossBrowserPaymentButton.style.display = 'none';
    //     }
    // });


    // retrieve payment intent
    // stripe.retrievePaymentIntent(clientSecret).then(function(result) {
    //     console.log(result);
    // });
    
    
    // listen for errors and display
    cardElement.addEventListener('change', function(event) {
        var displayError = document.getElementById('card-errors');
        if (event.error) {
          displayError.textContent = event.error.message;
        } else {
          displayError.textContent = '';
        }
    });


    cardButton.addEventListener('click', function(ev) {

        stripe.handleCardPayment(clientSecret, cardElement, {
            payment_method_data: {
                billing_details: {
                    name: cardholderName.value
                }
            }
        }).then(function(result) {

            if (result.error) {
                
                // Error with payment
                console.log("Error with payment");

                // TODO: handle error

            } else {
                if(result.paymentIntent.status === 'succeeded' || result.paymentIntent.status === "requires_capture"){
                    
                    // Payment success
                    console.log("Payment successful OR waiting for manual capture");

                    // handle response with AJAX
                    if(handleWithAjax){
                        
                        // intent data
                        var data = { 
                            currency: result.paymentIntent.currency,
                            description: result.paymentIntent.description,
                            id: result.paymentIntent.id,
                            created: result.paymentIntent.created,
                            amount: result.paymentIntent.amount,
                            status: result.paymentIntent.status
                        };
                        var url = form.getAttribute("action");
                        
                        // send request
                        sendAjax(url, "POST", data);
                        

                    }else{
                        // handle default form submission to the action url

                        // Send the token to your server.
                        stripeTokenHandler(result.paymentIntent.id);
                        
                        // Submit the form to server
                        form.submit();
                    }

                    // unload stripe payment
                    cardElement.unmount();
                    cardButton.remove();

                }
            }
        });

        // prevent browser default form submit
        ev.preventDefault();
    });

    function stripeTokenHandler(token) {

        // Insert the token ID into the form so it gets submitted to the server
        var hiddenInput = document.createElement('input');
        hiddenInput.setAttribute('type', 'hidden');
        hiddenInput.setAttribute('name', 'stripeToken');
        hiddenInput.setAttribute('value', token);
        form.appendChild(hiddenInput);
    }


    //
    // AJAX helper
    //
    
    function sendAjax(url, type, data){
        console.log(data)
            
        var xhr = new XMLHttpRequest();

        // Setup our listener to process request state changes
        xhr.onreadystatechange = function () {

            // Only run if the request is complete
            if (xhr.readyState !== 4) return;

            // Process our return data
            if (xhr.status >= 200 && xhr.status < 300) {
                // This will run when the request is successful
                // It checks to make sure the status code is in the 200 range
                console.log("AJAX successful");
                alert('success');

                dispatchStripeCallBack(xhr.response, "success");

            } else {
                
                // This will run when it's not
                // error code
                console.log("AJAX error");
                alert('error');
        
                // dispatch to eventlistener
                dispatchStripeCallBack(xhr.response, "error");
            }
        };

        // Create and send a request
        xhr.open(type, url);
        xhr.send(data);
    }

    // custom event doc 
    // https://developer.mozilla.org/en-US/docs/Web/Guide/Events/Creating_and_triggering_events
    var customAJAXEvent = document.createEvent("Event");
    customAJAXEvent.initEvent("stripeCallBack",false,false);

    function dispatchStripeCallBack(data, status){

        customAJAXEvent.response = data;
        customAJAXEvent.status = status;

        document.dispatchEvent(customAJAXEvent);
    }
})();
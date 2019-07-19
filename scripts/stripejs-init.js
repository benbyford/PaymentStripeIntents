;(function(){

    // ECMAScript5 compatible
    // @author: benbyford


    // document els
    var cardButton = document.getElementById('card-button');
    var form = document.getElementById('stripe-payment-form');
    var crossBrowserPaymentButton = document.getElementById('cross-browser-button');

    
    var handleWithAjax,
        clientSecret,
        publicKey,
        stripe,
        elements,
        currency = "USD",
        amount = 0,
        description = "Stripe payment",
        country = "US";


    if(form) { 
        handleWithAjax = Number(form.dataset.ajax); 
        country = form.dataset.country;
        description = form.dataset.description;
        amount = Number(form.dataset.amount);
        currency = form.dataset.currency;
    }

    if(cardButton){
        // 
        // bulk of the app
        // 

        // get intent information from form
        clientSecret = cardButton.dataset.secret;
        publicKey = cardButton.dataset.public;
        
        // init Stripe
        stripe = Stripe(publicKey);
        elements = stripe.elements();

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
        
        // mount form on page
        cardElement.mount('#card-element');

        // listen for errors and display
        cardElement.addEventListener('change', function(event) {

            // only show errors if the form hasn't been submitted
            if(submitted == false){
                
                var displayError = document.getElementById('card-errors');
                if (event.error) {

                    // disbale submit on error
                    cardButton.setAttribute("disabled","true");
                    cardButton.classList.add("disabled");

                    // display error
                    displayError.textContent = event.error.message;

                } else {

                    // enable button
                    cardButton.removeAttribute("disabled");
                    cardButton.classList.remove("disabled");

                    // remove error text
                    displayError.textContent = '';
                }
            }
        });


        var submitted = false;
        cardButton.addEventListener('click', function(ev) {
            
            // get email fo Stripe receipt
            var customerEmailInput = document.getElementById('cardholder-email');
            var customerPhoneInput = document.getElementById('cardholder-phone');
            var cardholderNameInput = document.getElementById('cardholder-name');
            
            var customerEmail, customerPhone, cardholderName;
        
            // get values from form inputs
            if(customerEmailInput != null) customerEmail = customerEmailInput.value;
            if(customerPhoneInput != null) customerPhone = customerPhoneInput.value;
            if(cardholderNameInput != null) cardholderName = cardholderNameInput.value;

            
            // handle payment submission            
            stripe.handleCardPayment(clientSecret, cardElement, {
                payment_method_data: {
                    billing_details: {
                        name: cardholderName,
                        email: customerEmail,
                        phone: customerPhone
                    }
                },
                receipt_email: customerEmail
            
            }).then(function(result) {

                if (result.error) {
                    
                    // Error with payment
                    console.log("Error with payment");

                    // send error to event listener
                    dispatchStripeCallBack(result, "error");

                } else {
                    // no error payment status is new state
                    // we currently only care about succeeded or requires capture states
                    if(result.paymentIntent.status === 'succeeded' || result.paymentIntent.status === "requires_capture"){
                        
                        // Payment success
                        console.log("Payment successful OR waiting for manual capture");

                        // handle response with AJAX or form submit
                        handleSuccess(result);
                        
                        // unload stripe payment
                        cardElement.unmount();
                        cardButton.remove();
                    }
                }
            });

            form.classList.add('submitted');

            // disable form button
            cardButton.classList.add('submitted');
            cardButton.classList.add('disabled');
            cardButton.setAttribute("disabled","true");
            
            submitted = true;

            // prevent browser default form submit
            ev.preventDefault();
        });


        // 
        // add cross browser payments button
        // https://stripe.com/docs/stripe-js/elements/payment-request-button
        // https://stripe.com/docs/stripe-js/reference#the-payment-request-object

        var paymentRequest = stripe.paymentRequest({
            country: country,
            currency: currency,
            total: {
                label: description,
                amount: amount, // this is simply a label of the mount that will be shown on device, the actual amount is set in the paymentsIntent
            },
            requestPayerName: true,
            requestPayerEmail: true,
        });

        // // Stripe elements payment request button + styling
        var prButton = elements.create('paymentRequestButton', {
            paymentRequest: paymentRequest,
            style: {
                paymentRequestButton: {
                height: '54px', // default: '40px', the width is always '100%'
                },
            },
        });

        // Check the availability of the Payment Request API first.
        paymentRequest.canMakePayment().then(function(result) {
            if (result) {
                
                // payment method available
                prButton.mount('#payment-request-button');

            }else{
                // no browser payment available
                if(crossBrowserPaymentButton) crossBrowserPaymentButton.style.display = 'none';
            }
        });

        paymentRequest.on('paymentmethod', function(ev) {
            stripe.confirmPaymentIntent(clientSecret, {
                payment_method: ev.paymentMethod.id,
                
            }).then(function(confirmResult) {

                if (confirmResult.error) {
                    // Report to the browser that the payment failed, prompting it to
                    // re-show the payment interface, or show an error message and close
                    // the payment interface.
                    ev.complete('fail');
                    
                    // show error message to user
                    form.innerText = "Error with payment";

                } else {

                    // Report to the browser that the confirmation was successful, prompting
                    // it to close the browser payment method collection interface.
                    ev.complete('success');

                    // Let Stripe.js handle the rest of the payment flow.
                    stripe.handleCardPayment(clientSecret).then(function(result) {
                        if (result.error) {
                            // The payment failed -- ask your customer for a new payment method.
                            form.innerText = "Payment error";

                        } else {
                            
                            // The payment has succeeded.
                            handleSuccess(result);

                            // unload stripe payment
                            cardElement.unmount();
                            cardButton.remove();
                            prButton.unmount();

                        }
                    });
                }
            });
          });


        // retrieve payment intent
        // stripe.retrievePaymentIntent(clientSecret).then(function(result) {
        //     console.log(result);
        // });
    }


    // 
    // submit successful result to the server
    //
    function handleSuccess(result){
        
        // submit via ajax
        if(handleWithAjax){
                        
            // intent data
            var data = "ajax=true&stripeToken="+result.paymentIntent.id+"&stripeStatus="+result.paymentIntent.status;
            var url = form.getAttribute("action");

            // 
            // send request
            //
            
            sendAjax(url, "POST", data);
            

        }else{
            // handle default form submission to the action url

            // add token to new input on form before submission
            stripeTokenHandler(result.paymentIntent.id, result.paymentIntent.status);

            // 
            // Submit the form to server
            // 

            form.submit();
        }
    }

    // add tokens to page before submission
    function stripeTokenHandler(token, status) {

        // Insert the token ID into the form so it gets submitted to the server
        var hiddenInputId = document.createElement('input');
        hiddenInputId.setAttribute('type', 'hidden');
        hiddenInputId.setAttribute('name', 'stripeToken');
        hiddenInputId.setAttribute('value', token);
        form.appendChild(hiddenInputId);
        
        var hiddenInputStatus = document.createElement('input');
        hiddenInputStatus.setAttribute('type', 'hidden');
        hiddenInputStatus.setAttribute('name', 'stripeStatus');
        hiddenInputStatus.setAttribute('value', status);
        form.appendChild(hiddenInputStatus);
    }


    //
    // AJAX helper
    //
    
    function sendAjax(url, type, data){
            
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

                dispatchStripeCallBack(xhr.response, "success");

            } else {
                
                // This will run when it's not
                // error code
                console.log("AJAX error");
        
                // dispatch to eventlistener
                dispatchStripeCallBack(xhr.response, "error");
            }
        };

        console.log(data);
        
        // Create and send a request
        xhr.open(type, url);
        // Send the proper header information along with the request
        xhr.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');

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
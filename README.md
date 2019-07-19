# PaymentStripeIntents

__Processwire Stripe Intents and StripeJS integration__

This modules allows you to add new Stripe Intents integration to you [Processwire](https://processwire.com/) site. The module provides an interface to create a pyament Intent, show payment form and cross browser payments button (Apple Pay, Google pay etc), and submit payment via StripeJS. Form action URL is followed on successful payment.

## Prerequisites:

example usage:
- Download and install module in Processwire
- Fill in module settings - public, private API keys, country and currency are required*.
- Website must enable HTTPS to take Stripe Payments.
- Create payments page template and add Stripe functionality to this one page e.g. checkout, or payments page
- Within Stripe account dashboard on Stripe.com, enable Apple pay button option by going to __Settings__ > __Apple Pay__ and following the instructions to add your domain.

# Usage:

In this example I'm going to pretend the Payment form and submission page are the same, this doesnt have to be the case but just bare that in mind.


Import module
```PHP
$payment = $modules->get("PaymentStripeIntents");
```

Add form CSS and Scripts
```PHP
echo "<script src='https://js.stripe.com/v3/'></script>";
echo $payment->getCss();
echo $payment->getScripts();
```

### Specific to form creation

Set basic settings - not required and will overright value in module settings within Processwire admin
```PHP
$payment->setCurrency("gbp");
```

Add customer info if available
```PHP
$customer = Array();
$customer['email'] = $user->email;
$customer['givenName'] = $user->fullname;
$payment->setCustomerData($customer);
```

```PHP
// if no payment total then stop rendering the page
if($total == null) {
    return $this->halt();
}
```

Add products
```PHP
$amount = $total*100;
$payment->addProduct($page->title, $amount, 1);
```

```PHP
// create payment intent
$url = $page->httpUrl;
// set return address - not required, will default to current page url
$payment->setProcessUrl($url . "?step=process");

$intent = $payment->paymentCheckout($description);`
```

### Specific to payment submission

Get payment Intent ID and status
```PHP
$stripeId = $sanitizer->text($input->post("stripeToken"));
$status = $sanitizer->text($input->post("stripeStatus"));
```

```PHP
// flush saved state within stripeintents module
$payment->paymentCompleted();
```

```PHP
if($stripeId && ($status == "succeeded" || $status == "requires_capture")){
    // do some stuff now your payment has been made
}
```

## Payment / store strategies

If you're payment page handles both the form setup and submission AND you can return something when queried with AJAX setting on then you can use AJAX instead of form submission to deal with the payment having completed.

Currently I have an implementation where I store all the price information in the $session and pass this to a dedicated payments page which is the only page with any Stripe code. On this page I display the prucahses info, and pass the total and description to PaymentStripeIntents module to create the form. After submit I create a new transaction page in the admin to show information about the payment e.g. who made it, when, for what products, captured payment or not (there is an option to uncpature payments so you have to go into stripe or setup another action to capture the payment thats been authorised by the user - I do this on one site already). and the Stripe Intent ID. I also enact the purchase -> which in my case is adding the purchasing user to an existing site subscription tier by adding them to a list and adding a user role to their user.

Any questions please post on [https://processwire.com/talk/](https://processwire.com/talk/) or contact me her: [https://www.benbyford.com](https://www.benbyford.com)


## TODO:

- Add subscription functionality
- Add customer functionality
- More testing and code clean up
- More usage examples

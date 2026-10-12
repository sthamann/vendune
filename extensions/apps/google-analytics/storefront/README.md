# Google Analytics storefront bridge

`ShopAnalytics.tsx` owns consent-bound GA4 ecommerce events and calls the shared
analytics SDK. The standard storefront imports this app-owned bridge; installation
does not copy its files into host source folders. An absent/disabled app or missing
purpose consent loads no external analytics script. Unit/browser fixtures remain
in the host integration suites because they test catalogue, checkout and consent
across their shared API boundary.

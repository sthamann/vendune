# Storefront analytics composition

The host imports the consent-aware [Google Analytics app interface](../../../../extensions/apps/google-analytics/storefront/ShopAnalytics.tsx). Its implementation and provider code live together in the app package. Shared SDK contracts remain under `extensions/sdk/analytics`.

Cross-system consent, storefront and checkout tests remain in `frontend/tests/unit/`; see [testing](../../../../docs/testing.md).

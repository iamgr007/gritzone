# 📱 GRITZONE Mobile App Guide

Capacitor is already installed. Icons are generated in `public/icons/`.

## Add Native Platforms

```bash
# Requires: macOS + Xcode for iOS, Android Studio for Android
npm run cap:add:ios
npm run cap:add:android

# Then regenerate native icons & splash for the platforms
npm run cap:assets

# Sync web build into native
npm run cap:sync

# Open in IDEs
npm run cap:open:ios       # macOS only
npm run cap:open:android
```

## Publishing Checklist

### iOS (Apple App Store)
- [ ] Apple Developer account ($99/year)
- [ ] App icon: 1024×1024 PNG
- [ ] Screenshots: 6.7" (iPhone 15 Pro Max), 6.5", 5.5" + iPad 12.9"
- [ ] Privacy policy URL: https://gritzone.me/privacy ✓ (done)
- [ ] App description (170 char) + keywords (100 char)
- [ ] Age rating questionnaire (Fitness: 4+)
- [ ] In-App Purchase config (if charging on iOS — Apple takes 30%!)
  - OR use Razorpay with "alternative payments" (requires approval)
- [ ] Review time: 24-48 hours

### Android (Google Play)
- [ ] Google Play Console ($25 one-time)
- [ ] App icon: 512×512 PNG
- [ ] Feature graphic: 1024×500
- [ ] Screenshots: phone + 7" tablet + 10" tablet
- [ ] Privacy policy URL: https://gritzone.me/privacy ✓
- [ ] Content rating questionnaire
- [ ] Data safety form
- [ ] Review: few hours to a day

---

## Important Notes

### Payments on iOS
Apple REQUIRES in-app purchases (IAP) for digital subscriptions and takes 30% (15% for subs after year 1).
**Workaround**: Don't offer subscription upgrade from inside the iOS app. Point users to the web at https://gritzone.me/pro.
Android is more lenient — Razorpay works fine.

### Update Strategy
Since `capacitor.config.ts` uses `server.url`, your web deploys (Vercel) update the mobile app immediately.
No store re-review needed for content/code changes. Only re-submit when you change native plugins or permissions.

### Icons & Splash
Use https://capacitorjs.com/docs/guides/splash-screens-and-icons or the [`@capacitor/assets`](https://www.npmjs.com/package/@capacitor/assets) tool:
```bash
npm install --save-dev @capacitor/assets
# Put icon.png (1024x1024) and splash.png (2732x2732) in resources/
npx capacitor-assets generate
```

### Offline Support
PWA service worker handles offline, but for better native experience consider adding:
- `@capacitor/preferences` — local cache
- `@capacitor/network` — detect online/offline

---

## Timeline
- **Week 1**: Install Capacitor, generate icons, test in simulators
- **Week 2**: Create developer accounts, prepare store assets (screenshots, descriptions)
- **Week 3**: Submit to both stores, respond to review feedback
- **Week 4**: Live on both stores

Total cost: $99 (Apple) + $25 (Google) = **$124 one-time + $99/year after**

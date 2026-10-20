const base = require("./app.json");

module.exports = {
  expo: {
    ...base.expo,
    android: {
      ...base.expo.android,
      config: {
        ...base.expo.android?.config,
        googleMaps: { apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "" },
      },
    },
    plugins: [
      ...base.expo.plugins,
      [
        "react-native-maps",
        { androidGoogleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "" },
      ],
    ],
  },
};

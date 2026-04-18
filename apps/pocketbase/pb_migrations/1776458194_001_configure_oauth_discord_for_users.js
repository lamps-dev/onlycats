/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("users");

  const newProviders = [
    {
        "name": "discord",
        "clientId": "1494797224490831892",
        "clientSecret": "3JTC5t4qPDFck2UsTJMrcX_8QE7iR2Qv",
        "authURL": "",
        "tokenURL": "",
        "userInfoURL": "",
        "displayName": "",
        "pkce": null
    }
];

  // Upsert: keep providers not in newProviders, then add/replace with newProviders
  collection.oauth2.providers = [
    ...collection.oauth2.providers.filter(p =>
      !newProviders.find(np => np.name === p.name)
    ),
    ...newProviders
  ];
  collection.oauth2.enabled = true;
  collection.oauth2.mappedFields = {
    id: "",
    name: "name",
    username: "",
    avatarURL: "avatar"
  };

  return app.save(collection);
}, (app) => {
  try {
    // Rollback: remove the added providers
    const collection = app.findCollectionByNameOrId("users");
    const providerNamesToRemove = ["discord"];
    collection.oauth2.providers = collection.oauth2.providers.filter(p =>
      !providerNamesToRemove.includes(p.name)
    );
    if (collection.oauth2.providers.length === 0) {
      collection.oauth2.enabled = false;
    }
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})

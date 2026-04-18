/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("followers");
  collection.indexes.push("CREATE UNIQUE INDEX idx_followers_userId_creatorId ON followers (userId, creatorId)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("followers");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_followers_userId_creatorId"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})

/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("likes");
  collection.indexes.push("CREATE UNIQUE INDEX idx_likes_userId_contentId ON likes (userId, contentId)");
  return app.save(collection);
}, (app) => {
  try {
  const collection = app.findCollectionByNameOrId("likes");
  collection.indexes = collection.indexes.filter(idx => !idx.includes("idx_likes_userId_contentId"));
  return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})

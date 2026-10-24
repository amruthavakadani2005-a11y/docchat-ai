import { Chunk } from "../models/Chunk.js";
import { generateEmbeddings } from "./embeddingService.js";

export const retrieveRelevantChunks = async (question, userId, documentIds) => {
  const questionEmbeddings = await generateEmbeddings([question]);
  const queryVector = questionEmbeddings[0];

  const pipeline = [
    {
      $vectorSearch: {
        index: "vector_index",
        path: "embedding",
        queryVector: queryVector,
        numCandidates: 100,
        limit: 6,
        filter: {
          userId: userId,
          documentId: { $in: documentIds },
        },
      },
    },
    {
      $lookup: {
        from: "documents",
        localField: "documentId",
        foreignField: "_id",
        as: "docDetails",
      },
    },
    { $unwind: "$docDetails" },
    {
      $project: {
        _id: 0,
        text: 1,
        page: 1,
        chunkIndex: 1,
        documentId: 1,
        documentTitle: "$docDetails.title",
        filePath: "$docDetails.filePath", // NEW: Pull the filePath through the pipeline
        score: { $meta: "vectorSearchScore" },
      },
    },
  ];

  return await Chunk.aggregate(pipeline);
};

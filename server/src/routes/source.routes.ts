import { Router } from "express";
import {
  bulkDeleteSources,
  createSource,
  deleteSource,
  getSource,
  importWebsite,
  importYoutube,
  listSources,
  uploadPdf,
} from "../controllers/source.controller.js";
import { uploadSinglePdf } from "../middleware/upload.middleware.js";


export const sourceRoutes = Router({ mergeParams: true });

sourceRoutes.post(
  "/upload",
  uploadSinglePdf,
  uploadPdf,
);
sourceRoutes.post("/import/website", importWebsite);
sourceRoutes.post("/import/youtube", importYoutube);
sourceRoutes.get("/", listSources);
sourceRoutes.post("/", createSource);
sourceRoutes.post("/bulk-delete", bulkDeleteSources);
sourceRoutes.get("/:sourceId", getSource);
sourceRoutes.delete("/:sourceId", deleteSource);
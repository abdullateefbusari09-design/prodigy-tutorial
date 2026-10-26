import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tutorialRouter from "./tutorial";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tutorialRouter);

export default router;

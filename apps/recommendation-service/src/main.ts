import express from "express";
import * as path from "path";
import cookieParser from "cookie-parser";
import recommendationRouter from "./routes/recommendation.route";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/api", recommendationRouter);

app.get("/api", (req, res) => {
  res.send({ message: "Welcome to recommendation-service!" });
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Recommendation service error", error);

    return res.status(500).json({
      success: false,
      message: "Recommendation service error",
    });
  },
);

const port = process.env.PORT || 6007;
const server = app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}/api`);
});
server.on("error", console.error);

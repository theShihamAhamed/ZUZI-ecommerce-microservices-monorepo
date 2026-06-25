import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Product Service API",
    description: "Auto generated swagger docs",
    version: "1.0.0",
  },
  host: "localhost:6002",
  schemes: ["http"],
};

const outputFile = "./swagger-output.json";
const routes = ["./routes/product.route.ts"];

swaggerAutogen()(outputFile, routes, doc);

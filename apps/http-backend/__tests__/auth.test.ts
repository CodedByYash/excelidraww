import request from "supertest";
import { response } from "express";
import { app } from "../src";

describe("Auth endpoints", () => {
  test("POST /auth/signup should create user", async () => {
    const response = await request(app).post("/auth/signup").send({
      email: "test@gmail.com",
      name: "Test User",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Signup Successful");
  });

  test("POST /auth/signin return token", async () => {
    const response = await request(app).post("/auth/signin").send({
      email: "test@gmail.com",
      password: "password123",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
    expect(typeof response.body.token).toBe("string");
  });

  test("GET /auth/me should return user info", async () => {
    const signinResponse = await request(app).post("/auth/signin").send({
      email: "test@example.com",
      password: "password123",
    });

    const token = signinResponse.body.token;

    const response = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
    expect(response.body.user.email).toBe("test@example.com");
  });
});

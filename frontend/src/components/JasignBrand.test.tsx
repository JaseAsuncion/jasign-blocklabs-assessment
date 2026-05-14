import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JasignWordmark } from "./JasignBrand";

describe("JasignWordmark", () => {
  it("renders the product name for accessibility", () => {
    render(<JasignWordmark compact />);
    expect(screen.getByLabelText("Jasign")).toBeTruthy();
  });
});

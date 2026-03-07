import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModeRail } from "../src/components/mode-rail";

describe("ModeRail", () => {
  it("renders all four platform modes as accessible links", () => {
    render(<ModeRail currentMode="work" spaceId="estate-grand-hall" />);

    expect(
      screen.getByRole("link", {
        name: /explore/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/explore");
    expect(
      screen.getByRole("link", {
        name: /inventory|work/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/work");
    expect(
      screen.getByRole("link", {
        name: /story/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/story");
    expect(
      screen.getByRole("link", {
        name: /review/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/review");
  });

  it("marks the active mode for assistive technology", () => {
    render(<ModeRail currentMode="review" spaceId="estate-grand-hall" />);

    expect(screen.getByRole("link", { name: /review/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});


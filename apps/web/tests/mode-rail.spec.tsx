import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ModeRail } from "../src/components/mode-rail";
import { LocaleProvider } from "../src/lib/i18n";

describe("ModeRail", () => {
  it("renders all five platform modes as accessible links", () => {
    render(
      <LocaleProvider>
        <ModeRail currentMode="work" spaceId="estate-grand-hall" />
      </LocaleProvider>
    );

    expect(
      screen.getByRole("link", {
        name: /erkunden/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/explore");
    expect(
      screen.getByRole("link", {
        name: /inventar/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/work");
    expect(
      screen.getByRole("link", {
        name: /story/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/story");
    expect(
      screen.getByRole("link", {
        name: /prüfen|pruefen/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/review");
    expect(
      screen.getByRole("link", {
        name: /listing/i,
      }),
    ).toHaveAttribute("href", "/spaces/estate-grand-hall/listing");
  });

  it("marks the active mode for assistive technology", () => {
    render(
      <LocaleProvider>
        <ModeRail currentMode="review" spaceId="estate-grand-hall" />
      </LocaleProvider>
    );

    expect(screen.getByRole("link", { name: /prüfen|pruefen/i })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});

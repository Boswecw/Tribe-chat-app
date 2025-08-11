// src/constants/theme.test.js
import { renderHook } from "@testing-library/react-native";
import * as RN from "react-native";
import { useTheme, lightTheme, darkTheme } from "./theme";

describe("useTheme", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns light theme when color scheme is light", () => {
    jest.spyOn(RN, "useColorScheme").mockReturnValue("light");
    const { result } = renderHook(() => useTheme());
    expect(result.current).toEqual(lightTheme);
  });

  it("returns dark theme when color scheme is dark", () => {
    jest.spyOn(RN, "useColorScheme").mockReturnValue("dark");
    const { result } = renderHook(() => useTheme());
    expect(result.current).toEqual(darkTheme);
  });
});

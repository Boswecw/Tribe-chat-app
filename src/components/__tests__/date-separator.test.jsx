import React from "react";
import { render } from "@testing-library/react-native";
import MessageGroup from "../MessageGroup";
import { groupMessages } from "../../utils/groupMessages";
import { formatDate } from "../../utils/formatDate";

describe("MessageGroup date separator", () => {
  const messages = [
    {
      uuid: "1",
      text: "First",
      participant: { uuid: "u1" },
      createdAt: "2023-01-01T10:00:00Z",
    },
    {
      uuid: "2",
      text: "Second",
      participant: { uuid: "u2" },
      createdAt: "2023-01-02T10:00:00Z",
    },
  ];
  const grouped = groupMessages(messages);

  it("renders date header for the first message", () => {
    const { getByText } = render(<MessageGroup group={grouped[0]} />);
    expect(getByText(formatDate(messages[0].createdAt))).toBeTruthy();
  });

  it("renders date header for subsequent messages on new days", () => {
    const { getByText } = render(<MessageGroup group={grouped[1]} />);
    expect(getByText(formatDate(messages[1].createdAt))).toBeTruthy();
  });
});

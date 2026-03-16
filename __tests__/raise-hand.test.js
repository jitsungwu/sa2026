import { describe, it, expect, vi, beforeEach } from "vitest"
import React from "react"
import { render, screen, fireEvent } from "@testing-library/react"

vi.mock("../src/firebaseClient", () => ({ db: {} }))

// Mock the local wrapper module so imports in the component resolve to mocks.
vi.mock("../src/lib/firestoreWrapper", () => ({
  addDoc: vi.fn(() => Promise.resolve({ id: "new" })),
  collection: vi.fn(() => ({})),
  serverTimestamp: vi.fn(() => "SERVER_TS"),
  query: vi.fn(() => ({})),
  where: vi.fn(() => ({})),
  onSnapshot: vi.fn((q, cb) => {
    // simulate empty snapshot
    cb({ docs: [] })
    return () => {}
  }),
}))

import RaiseHandButton from "../src/components/RaiseHandButton"
import * as wrapper from "../src/lib/firestoreWrapper"

const addDocMock = wrapper.addDoc
const collectionMock = wrapper.collection
const serverTimestampMock = wrapper.serverTimestamp

describe("RaiseHandButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("calls addDoc with expected collection and data, then disables button", async () => {
    render(React.createElement(RaiseHandButton, { classId: "demo", group: "1" }))
    const btn = screen.getByRole("button")
    expect(btn).toBeDefined()
    fireEvent.click(btn)

    // wait a tick for async call
    await new Promise((r) => setTimeout(r, 10))

    expect(collectionMock).toHaveBeenCalledWith({}, "hands_raised")
    expect(addDocMock).toHaveBeenCalled()
    const calledWithData = addDocMock.mock.calls[0][1]
    expect(calledWithData).toHaveProperty("classId", "demo")
    expect(calledWithData).toHaveProperty("group", "1")
    expect(calledWithData).toHaveProperty("active", true)
    expect(calledWithData).toHaveProperty("timestamp")
    expect(calledWithData).toHaveProperty("ownerId")
    expect(typeof calledWithData.ownerId).toBe("string")
  })
})

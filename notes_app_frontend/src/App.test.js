import { fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import { getStorageKey } from "./utils/notesStorage";

function setConfirmResult(value) {
  jest.spyOn(window, "confirm").mockImplementation(() => value);
}

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

test("renders app shell and empty state", () => {
  render(<App />);

  expect(screen.getByText(/retro notes/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/notes count/i)).toHaveTextContent("0");
  expect(screen.getByText(/no matches/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
});

test("can create a note and it persists to localStorage", () => {
  render(<App />);

  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: "My first note" },
  });
  fireEvent.change(screen.getByLabelText(/^note$/i), {
    target: { value: "Hello from the CRT era." },
  });

  fireEvent.click(screen.getByRole("button", { name: /save/i }));

  // appears in list
  expect(
    screen.getByRole("button", { name: /open note my first note/i })
  ).toBeInTheDocument();
  expect(screen.getByLabelText(/notes count/i)).toHaveTextContent("1");

  // persisted
  const raw = window.localStorage.getItem(getStorageKey());
  expect(raw).toBeTruthy();
  const parsed = JSON.parse(raw);
  expect(parsed).toHaveLength(1);
  expect(parsed[0].title).toBe("My first note");
  expect(parsed[0].body).toBe("Hello from the CRT era.");
});

test("can edit and delete a note", () => {
  render(<App />);

  // create
  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: "Alpha" },
  });
  fireEvent.change(screen.getByLabelText(/^note$/i), {
    target: { value: "Body A" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save/i }));

  // open from list (also ensures list interaction works)
  fireEvent.click(screen.getByRole("button", { name: /open note alpha/i }));

  // edit
  fireEvent.change(screen.getByLabelText(/title/i), {
    target: { value: "Alpha updated" },
  });
  fireEvent.click(screen.getByRole("button", { name: /save/i }));

  expect(
    screen.getByRole("button", { name: /open note alpha updated/i })
  ).toBeInTheDocument();

  // delete
  setConfirmResult(true);
  fireEvent.click(screen.getByRole("button", { name: /delete/i }));

  expect(screen.getByLabelText(/notes count/i)).toHaveTextContent("0");
});

test("search and 'only notes with content' filter work", () => {
  // preload storage with two notes: one empty, one with content
  window.localStorage.setItem(
    getStorageKey(),
    JSON.stringify([
      {
        id: "n1",
        title: "Groceries",
        body: "Milk and eggs",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "n2",
        title: "",
        body: "",
        createdAt: Date.now(),
        updatedAt: Date.now() - 1000,
      },
    ])
  );

  render(<App />);

  // notes count reflects all notes (unfiltered list count pill is filtered count)
  expect(screen.getByLabelText(/notes count/i)).toHaveTextContent("2");

  // search should match only the groceries note
  fireEvent.change(screen.getByLabelText(/search/i), {
    target: { value: "milk" },
  });
  expect(screen.getByLabelText(/notes count/i)).toHaveTextContent("1");
  expect(
    screen.getByRole("button", { name: /open note groceries/i })
  ).toBeInTheDocument();

  // clear search and apply "only notes with content"
  fireEvent.change(screen.getByLabelText(/search/i), {
    target: { value: "" },
  });
  fireEvent.click(screen.getByLabelText(/only notes with content/i));

  expect(screen.getByLabelText(/notes count/i)).toHaveTextContent("1");
  expect(
    screen.getByRole("button", { name: /open note groceries/i })
  ).toBeInTheDocument();
});

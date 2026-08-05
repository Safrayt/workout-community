import { createBrowserRouter } from "react-router-dom";

import Layout from "../components/layout/Layout";

import Home from "../pages/Home/Home";
import Profile from "../pages/Profile/Profile";
import Events from "../pages/Events/Events";
import CreateEvent from "../pages/CreateEvent/CreateEvent";
import Diary from "../pages/Diary/Diary";
import AddWorkoutEntry from "../pages/AddWorkoutEntry/AddWorkoutEntry";
import WorkoutEntryDetails from "../pages/WorkoutEntryDetails/WorkoutEntryDetails";
import Playgrounds from "../pages/Playgrounds/Playgrounds";
import EventDetails from "../pages/EventDetails/EventDetails";
import EditEvent from "../pages/EditEvent/EditEvent";
import PlaygroundDetails from "../pages/PlaygroundDetails/PlaygroundDetails";
import AddPlayground from "../pages/AddPlayground/AddPlayground";
import EditPlayground from "../pages/EditPlayground/EditPlayground";
import Achievements from "../pages/Achievements/Achievements";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "profile",
        element: <Profile />,
      },
      {
        path: "achievements",
        element: <Achievements />,
      },
      {
        path: "events",
        element: <Events />,
      },
      {
        path: "events/:id",
        element: <EventDetails />,
      },
      {
        path: "events/:id/edit",
        element: <EditEvent />,
      },
      {
          path: "events/create",
          element: <CreateEvent />,
      },
      {
        path: "diary",
        element: <Diary />,
      },
      {
        path: "diary/create",
        element: <AddWorkoutEntry />,
      },
      {
        path: "diary/:id",
        element: <WorkoutEntryDetails />,
      },
      {
        path: "playgrounds",
        element: <Playgrounds />,
      },
      {
          path: "playgrounds/:id",
          element: <PlaygroundDetails />,
      },
      {
          path: "playgrounds/:id/edit",
          element: <EditPlayground />,
      },
            {
          path: "playgrounds/add",
          element: <AddPlayground />,
      },
    ],
  },
]);
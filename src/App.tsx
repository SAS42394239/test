import { createHashRouter, RouterProvider } from "react-router-dom";
import Layout from "./components/Layout";
import Today from "./pages/Today";
import Food from "./pages/Food";
import Gym from "./pages/Gym";
import Run from "./pages/Run";
import Cycle from "./pages/Cycle";

const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Today /> },
      { path: "food", element: <Food /> },
      { path: "gym", element: <Gym /> },
      { path: "run", element: <Run /> },
      { path: "cycle", element: <Cycle /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

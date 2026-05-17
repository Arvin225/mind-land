import { RouterProvider } from "react-router-dom";
import router from "./router";
import { Provider } from "react-redux";
import store from "./store";
import { ToastProvider } from "@/components/ToastProvider";

function App() {
  return (
    <Provider store={store}>
      <ToastProvider>
        <div className="App">
          <RouterProvider router={router}></RouterProvider>
        </div>
      </ToastProvider>
    </Provider>
  )
}

export default App;

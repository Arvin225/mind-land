import { RouterProvider } from "react-router-dom";
import router from "./router";
import { Provider } from "react-redux";
import store from "./store";
import { ConfigProvider, theme } from "antd";

function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        components: {
          Tree: {
            titleHeight: 35.980
          }
        }
      }}>
      <Provider store={store}>
        <div className="App">
          <RouterProvider router={router}></RouterProvider>
        </div>
      </Provider>
    </ConfigProvider>
  )
}

export default App;

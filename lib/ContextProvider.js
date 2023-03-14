import React from "react";

const TestLabContext = React.createContext();

const TestLabProvider = ({ children, config }) => {
  const [sdkClient, setSdkClient] = React.useState();
  const [clientReady, setClientReady] = React.useState(false);

  React.useEffect(() => {
    if (clientReady) return;
    const connect = async () => {
      const client = await config.connect();
      setSdkClient(client);
      setClientReady(true);
    };
    connect();
  }, [clientReady, config]);

  React.useEffect(() => {
    if (!clientReady) return;

    const fetchData = async () => {
      let featureCheck = await sdkClient.checkNewFeatures();
      if (featureCheck === 304) return;
      const newClient = Object.assign(
        Object.create(Object.getPrototypeOf(sdkClient)),
        sdkClient
      );
      newClient.features = featureCheck;
      setSdkClient(newClient);
    };

    const interval = setInterval(() => {
      fetchData();
    }, sdkClient.config.interval);

    return () => clearInterval(interval);
  }, [clientReady, sdkClient]);

  if (!sdkClient) return null;

  return (
    <TestLabContext.Provider value={{ sdkClient }}>
      {children}
    </TestLabContext.Provider>
  );
};

export { TestLabContext, TestLabProvider };

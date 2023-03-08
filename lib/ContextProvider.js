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
      const newClient = Object.assign(
        Object.create(Object.getPrototypeOf(sdkClient)),
        sdkClient
      );
      await newClient.fetchFeatures();
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

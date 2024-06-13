import { ApolloClient, ApolloProvider, InMemoryCache, ApolloLink } from "@apollo/client";
import { createHttpLink } from "apollo-link-http";
import { MultiAPILink } from "@habx/apollo-multi-endpoint-link";
import React from "react";
import { ThemeSwitcherProvider } from "react-css-theme-switcher";
import { BrowserRouter } from "react-router-dom";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";

const themes = {
  dark: `${process.env.PUBLIC_URL}/dark-theme.css`,
  light: `${process.env.PUBLIC_URL}/light-theme.css`,
};

const client = new ApolloClient({
  link: ApolloLink.from([
    new MultiAPILink({
      endpoints: {
        // metadata: `https://api.thegraph.com/subgraphs/name/ipatka/plantoid-polygon`,
        //metadata: `https://api.studio.thegraph.com/query/68539/plantoid-polygon/version/latest`,
        metadata: `https://gateway-arbitrum.network.thegraph.com/api/5aa71d6a9735426594a4f8c82de56afc/subgraphs/id/EmnBAZcJGouYxmcApwMKspGqNTY79f5tw5oDh7AvqFue`,
        // mainnet: `https://api.thegraph.com/subgraphs/name/ipatka/plantoid-mainnet-v2`,
        //mainnet: `https://api.studio.thegraph.com/query/68539/plantoid-mainnet/version/latest`,
        //mainnet: `https://gateway-arbitrum.network.thegraph.com/api/5aa71d6a9735426594a4f8c82de56afc/subgraphs/id/5FbEjXiC3nEKPXtNav8uTnUZfLrJvf5Kk2VL75CZzGm2`,
        mainnet: `https://gateway-arbitrum.network.thegraph.com/api/5aa71d6a9735426594a4f8c82de56afc/subgraphs/id/HCzhXN9mNjupmWemF6NsTmuoYFUonfwSmjHJ5MC8z3Rq`,
        goerli: `https://api.thegraph.com/subgraphs/name/yaoe/plantoid-14-goerli`,
        // sepolia: `https://api.studio.thegraph.com/query/68539/plantoid-studio-sepolia/version/latest`,
        sepolia: `https://api.studio.thegraph.com/query/68539/plantoid-sep/3`,

       // sepolia: `https://api.thegraph.com/subgraphs/name/yaoe/plantoid-sepoliai`,
      },
      // defaultEndpoint: 'https://api.thegraph.com/subgraphs/name/ipatka/daostar',
      httpSuffix: "",
      createHttpLink: createHttpLink,
    }),
  ]),
  cache: new InMemoryCache({}),
});

ReactDOM.render(
  <ApolloProvider client={client}>
    <ThemeSwitcherProvider themeMap={themes} defaultTheme={"dark"}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeSwitcherProvider>
  </ApolloProvider>,
  document.getElementById("root"),
);

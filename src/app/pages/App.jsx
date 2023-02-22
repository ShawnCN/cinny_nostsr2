import React from 'react';

import { isAuthenticated } from '../../client/state/auth';

import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';
import ReactGA from 'react-ga4';

ReactGA.initialize(process.env.VITE_GOOGLE_ANALYTICS);

function App() {
  return isAuthenticated() ? <Client /> : <Auth />;
}

export default App;

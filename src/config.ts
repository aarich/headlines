const config = {
  apiUrl: process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '',
};

export default config;

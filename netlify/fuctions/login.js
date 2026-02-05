exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { email, password } = JSON.parse(event.body);

  if (email === "test@gmail.com" && password === "1234") {
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  }

  return {
    statusCode: 401,
    body: JSON.stringify({ success: false })
  };
};

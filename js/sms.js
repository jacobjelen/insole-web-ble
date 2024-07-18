require('dotenv').config();

const sendSMS = async (number, message) => {
    const url = "https://rest.clicksend.com/v3/sms/send";
    const username = "jacobjelen@gmail.com";
    const password = "25B8D81A-0705-3EC3-DE2F-F43A37573DB5";
    const encodedCredentials = btoa(`${username}:${password}`);
  
    const data = {
      messages: [
        {
          source: "php",
          body: message,
          from: "Infitex",
          to: number,
        },
      ],
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Basic ${encodedCredentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const responseData = await response.json();
      // console.log(responseData);
      return responseData;

    } catch (error) {
      console.error('Error:', error);
    }
  };
  

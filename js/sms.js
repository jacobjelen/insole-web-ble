/**
 * Sends an SMS message via ClickSend API
 * 
 * @param {string} number Phone number to send SMS to
 * @param {string} message Message to be sent
 * @returns {Promise<Object>} Response data from API
 */

export const sendSMS = async (number, message) => {
    const url = "https://rest.clicksend.com/v3/sms/send";
    const username = "jacobjelen@gmail.com";
    const password = "25B8D81A-0705-3EC3-DE2F-F43A37573DB5";
    const encodedCredentials = btoa(`${username}:${password}`); // base64 encoded
  
    const data = {
      messages: [
        {
          source: "php",
          body: message,
          // from: "Infitex",
          to: number,
        },
      ],
    };
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          // Basic auth, base64 encoded
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
  


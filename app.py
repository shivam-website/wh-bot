import requests
import json

# Function to send message to Mistral and get the response
def ask_mistral(user_message):
    url = "http://localhost:11434/api/chat"  # Replace with your Mistral API URL if different

    # Structure the message data
    messages = [
        {
            "role": "system",
            "content": "You are Shivam's Free Fire top-up assistant bot on WhatsApp 💎. Greet the user politely. "
                       "If someone asks about diamond prices, give this list clearly:\n\n"
                       "💎 Diamond Top-Up Prices:\n"
                       "- 100💎 = Rs. 100\n"
                       "- 310💎 = Rs. 290\n"
                       "- 520💎 = Rs. 460\n"
                       "- 1060💎 = Rs. 900\n\n"
                       "If they ask how to buy, explain it’s instant and trusted — they can pay via Esewa, Khalti, or Bank. "
                       "If they have doubts or want more help, tell them to message or call Shivam directly at 📞 98XXXXXXXX. "
                       "Answer like a friend, using casual Nepali/English mix. Don’t spam. Add 1 emoji at the end if possible."
        },
        {
            "role": "user",
            "content": user_message
        }
    ]

    # Prepare the request data
    request_data = {
        "model": "mistral",  # Replace with your Mistral model if different
        "messages": messages,
        "stream": False
    }

    # Convert the data to JSON
    json_data = json.dumps(request_data)

    # Set the headers to indicate JSON content
    headers = {
        "Content-Type": "application/json"
    }

    try:
        # Send the request to the Mistral API
        response = requests.post(url, data=json_data, headers=headers)

        # Check if the request was successful
        if response.status_code == 200:
            response_data = response.json()
            # Extract the reply content from the response
            reply = response_data.get("message", {}).get("content", "No response from Mistral.")
            return reply
        else:
            return f"Error: {response.status_code} - {response.text}"

    except Exception as e:
        return f"Error: {str(e)}"

# Example usage
user_message = "How can I top up diamonds?"
reply = ask_mistral(user_message)
print(reply)

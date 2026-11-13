import asyncio
import json
import websockets


async def main():
    async with websockets.connect("ws://localhost:8000/ws") as ws:
        await ws.send(json.dumps({
            "message": "Create a budget at outputs/budget7.xlsx for a PHP 30,000 school event"
        }))
        while True:
            event = json.loads(await ws.recv())
            print(event)
            if event["type"] == "reply":
                break


asyncio.run(main())
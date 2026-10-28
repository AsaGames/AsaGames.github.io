# Super Poop Odyssey

A game by Asa, age 6. Play it at https://asagames.github.io/poop-odyssey/

You're a poop sitting in the toilet... and then somebody flushes. Explore 7 kingdoms in 3D, all the way from the toilet bowl to the big blue ocean. You can't lose. When you get hit you get smaller, and the bigger you are when you reach the beach, the better your ending.

## Controls

| | Keyboard | Phone or tablet |
|---|---|---|
| Run | Arrow keys or WASD | Joystick |
| Jump | Space | JUMP |
| Fart jump | Space again in the air | JUMP again in the air |
| Swim up | Hold Space | Hold JUMP |
| Hop out of a ducky, bubble, roll or fish | Space again in the air (or X) | HOP OUT |
| Turn the camera | Q and E | Drag the screen |
| Closet | C | Shirt button |
| Sound on/off | M | Speaker button |
| Pause | Esc | Pause button |

Walk into doors, shops and signs to use them. Jump on top of the green pipe to go to the next kingdom.

## The 7 kingdoms

1. **Toilet Bowl Kingdom.** Toilet paper monsters, falling plungers and a soap bubble that floats you way up high.
2. **House Pipes Kingdom.** Lego bricks, drips, toy cars, a rubber ducky and a toilet paper roll that smashes cracked walls.
3. **Stinky Sewer Kingdom.** A river of yucky green goo, grumpy poops and gators.
4. **Fan & Grate Kingdom.** Spinning fans, sharp grates and big winds that lift you up.
5. **Water Plant Kingdom.** Cleaning tanks with stirring paddles, smashing presses and cleaning robots.
6. **Giant Ocean Pipe.** Rushing water pushes you toward the ocean. Watch out for crabs.
7. **The Big Blue Ocean.** Swim with a fish past jellyfish and sharks to the beach.

## Golden Corn, corn and outfits

- **Golden Corn.** Every kingdom has 5 hidden around it, like the Power Moons in Mario Odyssey. Find 3 to open the exit pipe (2 in the ocean). Some are only reachable with an outfit from a later kingdom, so go back and look for them.
- **Corn.** Every 5 corn makes you bigger. Mr. Whiskers the rat sells outfits and Grow Snacks for corn.
- **Outfits.** 14 to collect: 7 hidden in presents (one per kingdom) and 7 from the shop. Wear them for fun, and wear the right one to get into a costume door. Some outfits do things: goggles let you stand on ghost blocks, and the hard hat smashes cracked blocks.
- **Endings.** Your size when you reach the beach picks one of 4 endings. The biggest one turns you into Poop Island.

Your Golden Corn, outfits and kingdoms are saved in your browser on this device.

## For grown-ups

Plain HTML and JavaScript with [three.js](https://threejs.org/) r128, no build step. The kingdom layouts are made by `tools/levels.py`, which writes `levels.js` and checks that every kingdom can be finished. After changing a kingdom, run `python3 tools/levels.py`.

/* Content copied verbatim from the original MindEase app. */
export const HELPLINES = [
  { name: "Tele-MANAS (Govt. of India)", contact: "14416 or 1-800-891-4416", note: "Free, 24/7, many Indian languages" },
  { name: "iCall (TISS)", contact: "9152987821", note: "Professional counselling; check current hours" },
  { name: "Emergency services (India)", contact: "112", note: "If you or someone else is in immediate danger" },
  { name: "Outside India", contact: "https://findahelpline.com", note: "Directory of crisis lines by country" }
];

export const CRISIS = [/\bkill (myself|my self)\b/i, /\bsuicid(e|al)\b/i, /\bend (my|it all|my life)\b/i, /\bwant(ed)? to die\b/i,
  /\bwish i (was|were) dead\b/i, /\bdon'?t want to (live|be alive|exist)\b/i, /\bno (reason|point) (in )?(living|to live)\b/i,
  /\bbetter off (dead|without me)\b/i, /\b(hurt|harm|cut|cutting) myself\b/i, /\bself[- ]?harm\b/i, /\btake my own life\b/i,
  /\bending (my life|things)\b/i, /\boverdose\b/i];
export const ELEVATED = [/\bhopeless\b/i, /\bworthless\b/i, /\bcan'?t (go on|do this anymore|take (it|this) anymore)\b/i,
  /\bno one (cares|would notice)\b/i, /\bnothing matters\b/i, /\bi('| a)m a burden\b/i, /\bgive up on (everything|life)\b/i, /\bpanic attack\b/i];

export const ACTIVITIES = [
  { id: "box", type: "breathing", title: "Box breathing", minutes: 2, moods: ["anxious","stressed","overwhelmed","panic"],
    steps: ["Sit comfortably and relax your shoulders.","Breathe in through your nose for 4 seconds.","Hold gently for 4 seconds.","Breathe out slowly for 4 seconds.","Hold for 4 seconds. Repeat 4 to 6 rounds."] },
  { id: "senses", type: "grounding", title: "5-4-3-2-1 grounding", minutes: 3, moods: ["anxious","overwhelmed","panic","stressed"],
    steps: ["Name 5 things you can see.","Name 4 things you can feel (chair, fabric, floor).","Name 3 things you can hear.","Name 2 things you can smell.","Name 1 thing you can taste, or take one slow breath."] },
  { id: "dump", type: "writing", title: "Brain dump", minutes: 5, moods: ["stressed","overwhelmed","tired","unmotivated"],
    steps: ["Set a 5-minute timer.","Write everything on your mind without editing or ordering.","Circle only the one thing that is truly urgent today.","Everything else can wait. You just moved it out of your head."] },
  { id: "tiny", type: "micro-task", title: "One tiny win", minutes: 5, moods: ["unmotivated","tired","sad","stuck"],
    steps: ["Pick something under 5 minutes: drink water, open the textbook, make the bed.","Do just that one thing. Stopping afterwards is allowed.","Notice how it felt. Tiny starts count."] },
  { id: "walk", type: "micro-task", title: "10-minute walk, no phone", minutes: 10, moods: ["tired","sad","stressed","lonely","unmotivated"],
    steps: ["Step outside or walk a corridor, phone in your pocket.","Notice three things you had not noticed before.","Walk back at whatever pace feels right."] },
  { id: "reach", type: "connection", title: "Send one low-pressure message", minutes: 3, moods: ["lonely","sad"],
    steps: ["Think of one person you feel even slightly safe with.","Send something small: a meme, 'thinking of you', or 'free for chai this week?'","You do not need to explain how you feel. Connection can start small."] },
  { id: "good", type: "reflection", title: "Three small good things", minutes: 4, moods: ["sad","tired","lonely","stuck"],
    steps: ["Write down three things from today that were okay or slightly good.","They can be tiny: warm food, a friend's joke, a song.","For each, add one line on why it happened."] },
  { id: "worry", type: "reflection", title: "Worry vs. control", minutes: 6, moods: ["anxious","stressed","overwhelmed"],
    steps: ["Write your top worry in one sentence.","Split a page in two: 'I can influence this' and 'I cannot'.","Pick one small action from the first column. Let the second column rest for tonight."] },
  { id: "lighthouse", type: "story", title: "The Lighthouse Keeper (story)", minutes: 5, moods: ["tired","lonely","stressed"],
    steps: ["Imagine a lighthouse on a quiet coast at dusk. You are the keeper, and there is no rush tonight.","A small boat drifts in the fog. Do you light the lamp, or call out softly?","Type your choice in the chat and keep the story going in your own words."] }
];

export const MOODS = {
  anxious: ["anxious","anxiety","nervous","worried","worry","scared"], panic: ["panic","can't breathe"],
  stressed: ["stress","pressure","deadline","exam"], overwhelmed: ["overwhelm","too much","drowning"],
  tired: ["tired","exhausted","drained","burnt","burned out","burnout"],
  unmotivated: ["unmotivated","no motivation","can't focus","procrastinat","lazy"],
  sad: ["sad","down","low","cry","empty"], lonely: ["lonely","alone","isolated","no friends","homesick"], stuck: ["stuck","lost","directionless"]
};

export const RESOURCES = [
 { title: "Managing Exam and Academic Stress", tags: "exams stress academic pressure study deadlines", sections: [
  ["Why exam stress feels so loud","Exam stress is your body treating a deadline like a threat. A racing heart, a blank mind and trouble sleeping are common stress responses, not signs that you are failing. Naming it as stress rather than proof you are not good enough takes some of its power away."],
  ["Shrinking an overwhelming syllabus","When the syllabus feels like a wall, stop looking at the whole wall. List the topics, mark each as strong, shaky or untouched, and start with one shaky topic for just 25 minutes. Take a 5 minute break, then repeat. Progress on small pieces lowers panic more than planning the perfect schedule."],
  ["The night before an exam","Do a light revision of key formulas or headings, then stop. Pack your bag, drink water, and aim for a regular bedtime. Sleep helps memory more than one extra hour of cramming. If your mind races, write the worries on paper and look at them tomorrow."],
  ["When you blank out during an exam","Put your pen down and take three slow breaths, with the exhale longer than the inhale. Move to a question you do know and return later. Memory usually comes back once your body calms down."],
  ["Comparing yourself to others","Classmates posting study hours or marks can make you feel behind. You only see their highlights, not their doubts. Try measuring against your own last week: did you understand something today that you did not last week?"] ]},
 { title: "Feeling Lonely at College", tags: "loneliness homesick friends isolation hostel new college", sections: [
  ["Loneliness is common and not a flaw","Many first-year students feel lonely, especially after moving away from home. Being surrounded by people does not guarantee feeling connected. Loneliness is a signal that you want closer connection, not evidence that something is wrong with you."],
  ["Starting small with connection","You do not need a best friend this week. Aim for low-pressure contact: sit with the same group in a class twice, ask a classmate about an assignment, join one club or study group for a few sessions. Familiar faces turn into friends slowly."],
  ["Staying connected to home","Homesickness fades more easily when you keep a rhythm: a short call at a fixed time, a photo of your day, or cooking something familiar. Keeping home ties does not stop you from building a life where you are now."],
  ["When you feel unseen around people","Sometimes the loneliness comes from not being able to be yourself with the people nearby. It can help to find one person you can be honest with, even about small things, and let trust build from there."],
  ["When to seek more support","If loneliness lasts for weeks, affects your sleep or appetite, or makes you want to withdraw from everyone, talk to a college counsellor or a doctor. Reaching out is a strength, not a failure."] ]},
 { title: "Low Motivation and Burnout", tags: "motivation burnout procrastination exhaustion tired focus", sections: [
  ["Motivation follows action","Waiting to feel motivated often means waiting a long time. Starting something tiny, such as opening the notebook for two minutes, can create the momentum that feeling alone could not. You are allowed to stop after the first two minutes."],
  ["Telling tiredness from burnout","Normal tiredness improves with rest. Burnout feels like emptiness, cynicism or dread about things that used to matter, and it does not go away with one good night of sleep. The answer is usually less load and more recovery, not more discipline."],
  ["Gentle ways to rebuild energy","Protect sleep first. Add a short daily walk in daylight. Eat something regular. Schedule one thing each day that is just for you and not for marks. These basics matter more than productivity apps."],
  ["Procrastination is about feelings","We tend to avoid tasks that make us feel anxious, bored or not good enough. Naming the feeling, for example 'I am avoiding this because I am afraid it will not be good', reduces its grip. Then shrink the task until it feels doable."],
  ["Permission to rest","Rest is not a reward you earn after finishing everything. A mind that never rests stops working well. Taking an evening off can protect tomorrow's focus."] ]},
 { title: "Sleep for Students", tags: "sleep insomnia night late tired", sections: [
  ["Why sleep matters for mood","Poor sleep makes anxiety, sadness and irritability stronger, and it makes problems feel bigger than they are. Even small improvements in sleep often make everything else feel more manageable."],
  ["A steadier routine","Wake up at about the same time each day, even on weekends. Get daylight early. Keep caffeine to the first half of the day. Moving your phone out of reach of the bed reduces late scrolling."],
  ["When your mind races at night","Keep a notepad by the bed and write down what you are worried about or need to do tomorrow. Then try slow breathing: in for 4 counts, out for 6. If you are still awake after about 20 minutes, get up, do something quiet in dim light, and return when sleepy."],
  ["All-nighters","Occasional late nights happen during deadlines, but repeated all-nighters hurt memory and concentration. A 20 minute nap in the afternoon is a better trade than another hour awake at 3 a.m."] ]},
 { title: "Calming Anxiety in the Moment", tags: "anxiety panic worry overwhelmed calm breathing grounding", sections: [
  ["Slow breathing","Breathe in through your nose for 4 seconds, hold for 4, breathe out slowly for 4, hold for 4. Repeat for a couple of minutes. A longer exhale signals your body that it is safe to settle."],
  ["Grounding with your senses","Name five things you see, four you can feel, three you hear, two you smell and one you taste. This pulls attention out of racing thoughts and back into the room."],
  ["Sorting worries","Ask whether a worry is something you can act on today or outside your control. Pick one small step for the first kind. For the second kind, practise letting it sit without solving it tonight."],
  ["When anxiety is more than stress","If anxiety is frequent, keeps you from classes, or comes with panic attacks, a counsellor or doctor can help. Many college counselling centres offer free sessions."] ]},
 { title: "Getting Human Support", tags: "help counsellor support helpline therapy talk to someone", sections: [
  ["When to reach a real person","Talking to an AI companion can help you feel heard, but it is not a substitute for people. Reach out to a counsellor, doctor or trusted person if feelings last for weeks, affect eating, sleeping or studying, or if you ever think about hurting yourself."],
  ["Free options in India","Tele-MANAS offers free 24/7 support at 14416 or 1-800-891-4416. iCall offers counselling at 9152987821. Many colleges have a student counselling cell or a faculty mentor. Check numbers and hours before relying on them."],
  ["How to start the conversation","You do not need perfect words. You can say 'I have been struggling lately and I would like to talk to someone'. A short message to a friend, a mentor, or the counselling office is enough to begin."] ]}
];

/* ============ RAG (BM25) ============ */

export const REFLECT = {
  stressed: ["That sounds like a lot of pressure to carry.","It makes sense you are feeling stretched thin."],
  anxious: ["That sounds really unsettling to sit with.","Feeling on edge like that is exhausting."],
  overwhelmed: ["When everything piles up at once, it is hard to even know where to start.","That sounds like a heavy amount to be holding."],
  tired: ["You sound really drained, and that is valid.","It sounds like you have been running on empty."],
  unmotivated: ["Losing the spark like that is frustrating, especially when there is work to do.","That flat, stuck feeling is hard to explain to people."],
  sad: ["I am sorry it is feeling this way. I am glad you said it out loud.","That sounds painful, and you do not have to rush past it."],
  lonely: ["Feeling alone is really hard, especially while adjusting to new surroundings.","Thank you for telling me. That kind of loneliness is more common than people admit."],
  stuck: ["Feeling stuck is uncomfortable, especially when you want things to move.","That in-between feeling can be really draining."],
  none: ["Thanks for sharing that with me.","I hear you.","That makes sense."]
};
export const FOLLOW = {
  stressed: ["What part of it is weighing on you the most right now?","When did it start to feel this heavy?","If you could take one thing off your plate this week, what would it be?"],
  anxious: ["Where do you notice it most: your thoughts, or in your body?","What is the worry that keeps coming back?"],
  overwhelmed: ["If we only looked at one piece of it, which piece would matter most?","What does 'too much' look like for you today?"],
  tired: ["Is it more body-tired, or mind-tired?","How have the last few days looked, sleep and otherwise?"],
  unmotivated: ["Is it that nothing feels worth starting, or that starting feels hard?","What used to feel exciting that does not as much now?"],
  sad: ["Do you want to tell me what is behind it, or would you rather have some company for a bit?","What does the sadness feel like today?"],
  lonely: ["Is it more that you are physically alone, or that you feel unseen even around people?","Who, if anyone, do you wish you could talk to right now?"],
  stuck: ["What would 'unstuck' look like, even a little bit?","What have you already tried that helped even slightly?"],
  none: ["Tell me more about that. What stood out to you most?","How did that sit with you?","What has been on your mind around this today?","What do you wish was different about it?"]
};

export const PERSONA = `You are MindEase, a warm, steady companion for college students dealing with academic pressure, demotivation, loneliness, exhaustion and sadness. You are talking with one student in a private chat.

How you talk:
- Listen first. Respond to what THIS student actually said: use their own details (the subject, the person, the deadline, the feeling) and reflect it in fresh words before anything else. Never give a reply that could fit any message.
- Ask at most ONE thoughtful follow-up question, and make it specific to what they just told you. Never a list of questions.
- Do NOT give advice, tips or action plans unless they ask or clearly want help deciding what to do. If they do want help, offer one or two concrete, small steps, not a long list.
- Never say "just work harder", "stay positive" or "look on the bright side". No clichés, no toxic positivity, no lecturing.
- Do not turn every chat into productivity. Sometimes people only need to feel heard.
- Vary your wording. Do not reuse openings or stock phrases from your earlier replies in this chat.
- Keep replies short: 2 to 5 sentences, plain conversational language, light formatting only. Reply in the language the student writes in (English, Hindi, Hinglish, etc.).
- You may offer an optional activity only when it genuinely fits, as an invitation they can decline.
- If their message is unclear, a single word, or a greeting, respond naturally and ask what is on their mind. Do not guess at problems they have not mentioned.

Boundaries:
- You are an AI companion, not a therapist. Do not diagnose. Be honest that you are an AI if asked, and do not claim human feelings or experiences.
- If someone may be in immediate danger or mentions suicide or self-harm, respond calmly and directly: encourage them to contact a trusted adult/person nearby now, use India emergency number 112 if there is immediate danger, and offer Tele-MANAS 14416. Do not provide graphic details, methods, or instructions. Do not imply you can monitor, protect, or stay with them. For a minor, encourage involving a safe parent/guardian, school or college counsellor, or another trusted adult.
- Use remembered context naturally and sparingly, only when it helps. Never recite it as a list or say you have a "memory".`;

export const CRISIS_REPLY = "I am really glad you told me. What you are feeling sounds incredibly heavy, and you deserve support from a real person right now, not just a chat window.\n\nPlease reach out to someone who can help right now. The numbers are below. If you can, tell someone near you: a friend, family member, hostel warden, or a college counsellor. You do not have to explain everything. Even \"I am not okay and I need you to stay with me\" is enough.\n\nIf you can, move near a trusted person and tell them plainly that you need support. Are you able to contact someone you trust right now?";

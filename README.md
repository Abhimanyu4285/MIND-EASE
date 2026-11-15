MindEase: Agentic AI Companion for Emotional Wellbeing
Problem Statement

Many students feel stress, anxiety, loneliness or low mood but have no immediate, judgement-free way to deal with it. Counsellors are often hard to reach, and stigma stops people from asking for help. Nobody notices when a bad phase turns serious. Most existing apps are passive chatbots that give the same advice to everyone and never learn what works for the individual.

Proposed Solution

MindEase is an agentic AI companion. It doesn’t just reply to messages. It senses how the user feels, checks for danger, chooses a coping strategy, acts on it, and learns from the user’s feedback. Over time it personalises its support.

How It Works: the Agentic Loop

Perceive → Assess Risk → Plan → Act → Reflect/Learn

Perceive (emotion detection): An NLP model (TF-IDF + Logistic Regression) classifies the message into 8 emotions: anxious, stressed, sad, lonely, angry, tired, happy, neutral. It also estimates intensity from intensifier words and punctuation.
Assess risk (safety layer): A rule-based crisis detector scans for self-harm or suicidal language before anything else. If triggered, it overrides the normal flow and shows emergency help (Tele-MANAS 14416, 112) and urges the user to contact a real person. Rules are used here instead of ML so the behaviour is predictable.
Plan (decision making): An epsilon-greedy bandit picks the best coping tool for that emotion. It mostly uses what has worked best for this user and sometimes tries alternatives.
Act (tools): It responds with an empathetic message plus a tool, such as:
box breathing
5-4-3-2-1 grounding
task chunking
journaling
cognitive reframing
social connection
anger release
rest reset
Reflect/learn: It asks “Did that help? 1–5”, updates the tool scores and saves them to persistent memory. An insights command summarises the user’s most frequent emotions and which strategies work best for them.
Key Features
Emotion-aware responses, not generic advice
Agentic behaviour: autonomous tool selection and action
Personalisation through reinforcement-style learning from feedback
Built-in crisis detection and escalation
Low-confidence handling: it asks for clarification instead of guessing
Persistent memory and emotional insights
Lightweight and privacy-friendly: it runs locally with no external API
Tech Stack

Python, scikit-learn (TF-IDF, Logistic Regression), regex-based safety rules, JSON memory store.

Results

In the demo, the agent classified exam anxiety, workload stress, loneliness and tiredness correctly. It switched strategy after a low rating (connect, rated 2, was replaced by journaling, rated 5). It also correctly triggered the crisis response for self-harm language.

Limitations and Ethics
It is a support tool, not a therapist, and it does not diagnose.
The seed dataset is small (~64 sentences), so accuracy is limited.
Replies are template-based.
The crisis response is always a hand-off to human help.
Future Scope
Train on large datasets (GoEmotions, DAIR-AI)
LLM-generated empathetic responses, keeping the safety layer and learning loop
Voice and mobile or web UI
Mood tracking dashboard with weekly reports
Multilingual support (Hindi and regional languages)
Optional connection to college counsellors
One-line pitch

MindEase is an AI companion that doesn’t just listen. It understands your emotion, keeps you safe, takes action, and learns what helps you most.

I can turn this into a PPT, a report, or a README for your submission if you want.

This project was built by Saumya Gupta and Abhimanyu Sharma

**Live app**: https://maker-moodboard-studio.lovable.app

import os
import google.generativeai as genai

env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../.env'))
gemini_key = os.environ.get("GEMINI_API_KEY", "")
if not gemini_key and os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.strip().startswith('GEMINI_API_KEY='):
                gemini_key = line.strip().split('=', 1)[1].strip("'\"")
                break

genai.configure(api_key=gemini_key)
for m in genai.list_models():
    if 'generateContent' in m.supported_generation_methods:
        print(m.name)

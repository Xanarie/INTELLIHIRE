# AI-Powered Conversational Pre-screening

## Overview

The conversational pre-screening system conducts intelligent, adaptive interviews with candidates using semantic analysis and rule-based logic. It evaluates responses in real-time and provides comprehensive recommendations.

## Architecture

### Core Components

1. **ConversationContext** - Tracks conversation state
   - Applicant information
   - Job details
   - Conversation history
   - Topics covered
   - Question count

2. **Topic Selection** - Intelligent topic prioritization
   - Analyzes job description for key themes
   - Scores topics by relevance
   - Ensures comprehensive coverage

3. **Response Analysis** - Multi-dimensional quality scoring
   - Semantic similarity with job description
   - Keyword relevance
   - Response detail and specificity
   - Quantitative metrics (numbers, proper nouns)

4. **Summary Generation** - Final recommendation
   - Combined scoring (60% match + 40% conversation)
   - Three-tier recommendations
   - Detailed metrics and insights

## Screening Topics

### 1. Experience
- Work history and relevant projects
- Years of experience
- Role-specific background

### 2. Skills
- Technical proficiencies
- Tools and technologies
- Problem-solving examples

### 3. Motivation
- Interest in the role
- Cultural fit
- Career goals

### 4. Availability
- Start date
- Notice period
- Salary expectations

### 5. Culture
- Work environment preferences
- Collaboration style
- Company values alignment

## Scoring System

### Response Quality Score (0-1)
```
Quality = 0.3 × Relevance + 
          0.3 × Semantic Similarity + 
          0.2 × Detail + 
          0.1 × Numbers + 
          0.1 × Specifics
```

### Final Recommendation Score (0-1)
```
Combined = 0.6 × Resume Match + 
           0.4 × Avg Conversation Quality
```

### Recommendation Tiers
- **Strong Match** (≥75%): Recommend for next interview stage
- **Potential Match** (≥55%): Consider for further review
- **Weak Match** (<55%): May not be the best fit

## API Usage

### Start a Conversation

```python
POST /ai/prescreen-chat/start
{
  "applicant_name": "John Doe",
  "position": "Software Engineer",
  "resume_text": "...",
  "job_description": "...",
  "match_score": 0.75
}

Response:
{
  "session_id": "uuid",
  "message": "Hello John! Thank you for applying...",
  "conversation_history": [...]
}
```

### Send a Message

```python
POST /ai/prescreen-chat/message
{
  "session_id": "uuid",
  "message": "I have 5 years of experience..."
}

Response:
{
  "message": "What specific projects have you worked on?",
  "is_complete": false,
  "conversation_history": [...],
  "summary": null
}
```

### Get Session Data

```python
GET /ai/prescreen-chat/session/{session_id}

Response:
{
  "session_id": "uuid",
  "applicant_name": "John Doe",
  "position": "Software Engineer",
  "match_score": 0.75,
  "conversation_history": [...],
  "topics_covered": ["experience", "skills"],
  "questions_asked": 3
}
```

## Frontend Integration

### Starting a Chat

```jsx
import PrescreenChat from './PrescreenChat';

<PrescreenChat
  applicant={applicantData}
  job={jobData}
  onClose={() => setShowChat(false)}
  onComplete={(summary) => {
    console.log('Recommendation:', summary.recommendation);
    console.log('Combined Score:', summary.combined_score);
  }}
/>
```

### Chat Features

- Real-time message exchange
- Response quality indicators
- Auto-scroll to latest messages
- Keyboard shortcuts (Enter/Shift+Enter)
- Comprehensive summary on completion
- Visual score indicators

## Configuration

### Conversation Settings

```python
@dataclass
class ConversationContext:
    max_questions: int = 5  # Maximum questions to ask
```

### Topic Keywords

Customize keywords in `SCREENING_TOPICS` to match your domain:

```python
SCREENING_TOPICS = {
    "experience": {
        "keywords": ["experience", "work", "project", ...],
        "questions": [...]
    },
    ...
}
```

## Best Practices

1. **Job Descriptions**: Provide detailed job descriptions for better topic selection
2. **Resume Quality**: Ensure resumes are parsed correctly for accurate match scores
3. **Session Management**: Clean up old sessions periodically (use Redis in production)
4. **Follow-ups**: System automatically asks follow-ups for vague responses
5. **Question Limit**: Keep conversations concise (default: 5 questions)

## Production Considerations

### Session Storage

Current implementation uses in-memory storage. For production:

```python
# Use Redis or database
import redis
redis_client = redis.Redis(host='localhost', port=6379)

# Store session
redis_client.setex(
    f"chat_session:{session_id}",
    3600,  # 1 hour TTL
    json.dumps(context.__dict__)
)
```

### Scaling

- Use message queues for async processing
- Cache embeddings for common phrases
- Implement rate limiting per session
- Add conversation timeout handling

### Monitoring

Track key metrics:
- Average conversation quality
- Completion rate
- Response time
- Topic coverage distribution
- Recommendation accuracy

## Example Conversation Flow

```
AI: Hello John! Thank you for applying for the Software Engineer position.
    I'd like to ask you a few quick questions. Ready to begin?

Candidate: Yes, I'm ready!

AI: Can you tell me about your most relevant work experience for this role?

Candidate: I've worked as a full-stack developer for 5 years, building web 
          applications using React and Node.js. My most recent project was 
          an e-commerce platform that handles 10k+ daily users.

[Analysis: Quality Score: 0.85 - Detailed, specific, relevant]

AI: What are your key technical skills relevant to this position?

Candidate: React, Node.js, PostgreSQL, AWS, Docker, CI/CD

[Analysis: Quality Score: 0.65 - Relevant but could be more detailed]

AI: Could you elaborate a bit more on that?

Candidate: I'm proficient in React with hooks and Redux for state management.
          On the backend, I use Node.js with Express and have experience with
          microservices architecture. I've deployed applications on AWS using
          EC2, S3, and RDS, and set up CI/CD pipelines with GitHub Actions.

[Analysis: Quality Score: 0.90 - Excellent detail and specificity]

... [3 more questions] ...

AI: Thank you for your time, John! We've completed the pre-screening.
    Strong candidate - recommend moving to next interview stage.
    You'll hear from our team soon regarding next steps.

Summary:
- Combined Score: 82%
- Match Score: 75%
- Conversation Quality: 95%
- Recommendation: strong_match
- Topics Covered: experience, skills, motivation
```

## Troubleshooting

### Low Quality Scores

- Check if responses are too short (< 10 words)
- Verify semantic similarity with job description
- Ensure keywords are relevant to your domain

### Poor Topic Selection

- Improve job description detail
- Customize topic keywords
- Adjust topic scoring weights

### Session Not Found

- Implement persistent storage (Redis/DB)
- Add session expiration handling
- Provide session recovery mechanism

## Future Enhancements

- [ ] Multi-language support
- [ ] Voice-to-text integration
- [ ] Sentiment analysis
- [ ] Custom question templates per role
- [ ] Interview scheduling integration
- [ ] Video chat capability
- [ ] Automated email follow-ups
- [ ] Analytics dashboard

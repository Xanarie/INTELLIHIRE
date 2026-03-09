# backend/app/ai/prescreen_chat.py
"""
AI-powered conversational pre-screening.
Uses rule-based + semantic analysis to conduct intelligent screening interviews.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
import re

from app.ai.embeddings import similarity, embed_text, cosine_similarity
import numpy as np


@dataclass
class ConversationContext:
    """Tracks the state of a pre-screening conversation."""
    applicant_name: str
    position: str
    resume_text: str
    job_description: str
    match_score: float
    conversation_history: List[Dict[str, str]] = field(default_factory=list)
    topics_covered: List[str] = field(default_factory=list)
    current_topic: Optional[str] = None
    questions_asked: int = 0
    max_questions: int = 5


# Pre-defined screening topics and questions
SCREENING_TOPICS = {
    "experience": {
        "questions": [
            "Can you tell me about your most relevant work experience for this role?",
            "What specific projects have you worked on that relate to {position}?",
            "How many years of experience do you have in this field?",
        ],
        "keywords": ["experience", "work", "project", "role", "years", "background"],
    },
    "skills": {
        "questions": [
            "What are your key technical skills relevant to this position?",
            "Which tools and technologies are you most proficient with?",
            "Can you describe a challenging technical problem you've solved?",
        ],
        "keywords": ["skills", "technical", "tools", "technology", "proficient", "expertise"],
    },
    "motivation": {
        "questions": [
            "What interests you most about this {position} role?",
            "Why do you think you'd be a good fit for our team?",
            "What are you looking for in your next opportunity?",
        ],
        "keywords": ["interest", "motivation", "fit", "opportunity", "goal", "career"],
    },
    "availability": {
        "questions": [
            "When would you be available to start if selected?",
            "Are you currently employed? What's your notice period?",
            "What are your salary expectations for this role?",
        ],
        "keywords": ["availability", "start", "notice", "salary", "compensation", "timeline"],
    },
    "culture": {
        "questions": [
            "What kind of work environment do you thrive in?",
            "How do you prefer to collaborate with team members?",
            "What's important to you in a company culture?",
        ],
        "keywords": ["culture", "environment", "team", "collaborate", "values", "work style"],
    },
}


def extract_key_requirements(job_description: str) -> List[str]:
    """Extract key requirements from job description."""
    requirements = []
    
    # Look for common requirement patterns
    patterns = [
        r"(?:require|must have|need)(?:d|s)?:?\s*([^\n.]+)",
        r"(?:experience with|knowledge of|proficiency in):?\s*([^\n.]+)",
        r"(?:\d+\+?\s*years?)\s+(?:of\s+)?(?:experience\s+)?(?:in|with)\s+([^\n.]+)",
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, job_description, re.IGNORECASE)
        for match in matches:
            req = match.group(1).strip()
            if req and len(req) > 5:
                requirements.append(req)
    
    return requirements[:5]  # Top 5 requirements


def select_next_topic(context: ConversationContext, job_description: str) -> str:
    """Select the next most relevant topic to discuss."""
    # Always start with experience
    if not context.topics_covered:
        return "experience"
    
    # Extract key themes from job description
    jd_lower = job_description.lower()
    
    # Score remaining topics by relevance
    remaining_topics = [t for t in SCREENING_TOPICS.keys() if t not in context.topics_covered]
    if not remaining_topics:
        return "experience"  # Fallback
    
    topic_scores = {}
    for topic in remaining_topics:
        keywords = SCREENING_TOPICS[topic]["keywords"]
        score = sum(1 for kw in keywords if kw in jd_lower)
        topic_scores[topic] = score
    
    # Return topic with highest score
    return max(topic_scores.items(), key=lambda x: x[1])[0]


def generate_question(context: ConversationContext, topic: str) -> str:
    """Generate a contextual question for the given topic."""
    questions = SCREENING_TOPICS[topic]["questions"]
    
    # Select question based on conversation progress
    q_index = min(len(context.conversation_history) % len(questions), len(questions) - 1)
    question = questions[q_index]
    
    # Personalize with position name
    question = question.replace("{position}", context.position)
    
    return question


def analyze_response_quality(response: str, topic: str, context: ConversationContext) -> Dict[str, any]:
    """Analyze the quality and relevance of a candidate's response."""
    response_lower = response.lower()
    
    # Check response length
    word_count = len(response.split())
    is_too_short = word_count < 10
    is_detailed = word_count > 30
    
    # Check for topic relevance using keywords
    topic_keywords = SCREENING_TOPICS[topic]["keywords"]
    keyword_matches = sum(1 for kw in topic_keywords if kw in response_lower)
    relevance_score = min(keyword_matches / len(topic_keywords), 1.0)
    
    # Check for specificity (numbers, proper nouns, technical terms)
    has_numbers = bool(re.search(r'\d+', response))
    has_specifics = bool(re.search(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', response))
    
    # Semantic similarity with job description
    semantic_score = similarity(response, context.job_description)
    
    # Calculate overall quality score
    quality_score = (
        (0.3 * relevance_score) +
        (0.3 * semantic_score) +
        (0.2 * (1.0 if is_detailed else 0.5)) +
        (0.1 * (1.0 if has_numbers else 0.0)) +
        (0.1 * (1.0 if has_specifics else 0.0))
    )
    
    return {
        "quality_score": round(quality_score, 2),
        "relevance_score": round(relevance_score, 2),
        "semantic_score": round(semantic_score, 2),
        "is_detailed": is_detailed,
        "is_too_short": is_too_short,
        "word_count": word_count,
    }


def generate_followup(response_analysis: Dict, topic: str, context: ConversationContext) -> Optional[str]:
    """Generate a follow-up question if the response needs clarification."""
    if response_analysis["is_too_short"]:
        return "Could you elaborate a bit more on that?"
    
    if response_analysis["relevance_score"] < 0.3:
        return f"That's interesting, but could you relate it more specifically to the {context.position} role?"
    
    # No follow-up needed
    return None


def generate_summary(context: ConversationContext) -> Dict[str, any]:
    """Generate a summary of the pre-screening conversation."""
    # Calculate average response quality
    total_quality = 0.0
    response_count = 0
    
    for msg in context.conversation_history:
        if msg["role"] == "candidate" and "analysis" in msg:
            total_quality += msg["analysis"]["quality_score"]
            response_count += 1
    
    avg_quality = total_quality / response_count if response_count > 0 else 0.0
    
    # Determine recommendation
    combined_score = (context.match_score * 0.6) + (avg_quality * 0.4)
    
    if combined_score >= 0.75:
        recommendation = "strong_match"
        message = "Strong candidate - recommend moving to next interview stage"
    elif combined_score >= 0.55:
        recommendation = "potential_match"
        message = "Potential candidate - consider for further review"
    else:
        recommendation = "weak_match"
        message = "May not be the best fit for this role"
    
    return {
        "recommendation": recommendation,
        "message": message,
        "combined_score": round(combined_score, 2),
        "match_score": round(context.match_score, 2),
        "conversation_quality": round(avg_quality, 2),
        "topics_covered": context.topics_covered,
        "questions_asked": context.questions_asked,
    }


def start_conversation(
    applicant_name: str,
    position: str,
    resume_text: str,
    job_description: str,
    match_score: float,
) -> Tuple[ConversationContext, str]:
    """Initialize a pre-screening conversation."""
    context = ConversationContext(
        applicant_name=applicant_name,
        position=position,
        resume_text=resume_text,
        job_description=job_description,
        match_score=match_score,
    )
    
    # Generate opening message
    greeting = (
        f"Hello {applicant_name}! Thank you for applying for the {position} position. "
        f"I'd like to ask you a few quick questions to learn more about your background and fit for this role. "
        f"This should only take a few minutes. Ready to begin?"
    )
    
    context.conversation_history.append({
        "role": "assistant",
        "content": greeting,
    })
    
    return context, greeting


def process_response(
    context: ConversationContext,
    candidate_response: str,
) -> Tuple[ConversationContext, str, bool]:
    """
    Process a candidate's response and generate the next question.
    
    Returns:
        (updated_context, next_message, is_complete)
    """
    # Add candidate response to history
    context.conversation_history.append({
        "role": "candidate",
        "content": candidate_response,
    })
    
    # Analyze the response if we're in a topic
    if context.current_topic:
        analysis = analyze_response_quality(candidate_response, context.current_topic, context)
        context.conversation_history[-1]["analysis"] = analysis
        
        # Check if follow-up is needed
        followup = generate_followup(analysis, context.current_topic, context)
        if followup and context.questions_asked < context.max_questions:
            context.conversation_history.append({
                "role": "assistant",
                "content": followup,
            })
            context.questions_asked += 1
            return context, followup, False
    
    # Move to next topic
    context.questions_asked += 1
    
    # Check if we've asked enough questions
    if context.questions_asked >= context.max_questions:
        summary = generate_summary(context)
        closing = (
            f"Thank you for your time, {context.applicant_name}! "
            f"We've completed the pre-screening. {summary['message']}. "
            f"You'll hear from our team soon regarding next steps."
        )
        context.conversation_history.append({
            "role": "assistant",
            "content": closing,
            "summary": summary,
        })
        return context, closing, True
    
    # Select next topic and generate question
    if context.current_topic:
        context.topics_covered.append(context.current_topic)
    
    next_topic = select_next_topic(context, context.job_description)
    context.current_topic = next_topic
    
    question = generate_question(context, next_topic)
    context.conversation_history.append({
        "role": "assistant",
        "content": question,
        "topic": next_topic,
    })
    
    return context, question, False

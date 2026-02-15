"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { saveSurveyResponse, checkSurveyCompleted, dismissSurvey, checkUserLoggedIn } from "@/actions/survey";

const VISITOR_ID_KEY = "survey_visitor_id";
const SURVEY_SHOWN_KEY = "survey_shown";

// Generate a unique visitor ID
function getOrCreateVisitorId(): string {
  if (typeof window === "undefined") return "";
  
  let visitorId = localStorage.getItem(VISITOR_ID_KEY);
  if (!visitorId) {
    visitorId = `v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(VISITOR_ID_KEY, visitorId);
  }
  return visitorId;
}

interface SurveyAnswers {
  notificationFrequency: string;
  notificationStyle: string;
  notificationStyleOther: string;
  preferredTime: string;
  customTime: string;
  motivationType: string;
  reminderFrequency: string;
  additionalFeedback: string;
}

export function SurveyModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answers, setAnswers] = useState<SurveyAnswers>({
    notificationFrequency: "",
    notificationStyle: "",
    notificationStyleOther: "",
    preferredTime: "",
    customTime: "",
    motivationType: "",
    reminderFrequency: "", // Keep for compatibility but won't be asked
    additionalFeedback: "", // Keep for compatibility but won't be asked
  });

  useEffect(() => {
    // Check if survey should be shown (delay for better UX)
    const checkAndShow = async () => {
      // Don't show if already shown this session
      if (sessionStorage.getItem(SURVEY_SHOWN_KEY)) return;
      
      // Only show to logged in users
      const { isLoggedIn } = await checkUserLoggedIn();
      if (!isLoggedIn) return;
      
      const visitorId = getOrCreateVisitorId();
      if (!visitorId) return;

      // Check if already completed
      const { completed } = await checkSurveyCompleted(visitorId);
      if (completed) return;

      // Show survey after a short delay
      setTimeout(() => {
        setIsOpen(true);
        sessionStorage.setItem(SURVEY_SHOWN_KEY, "true");
      }, 3000); // Show after 3 seconds
    };

    checkAndShow();
  }, []);

  const handleDismiss = async () => {
    const visitorId = getOrCreateVisitorId();
    await dismissSurvey(visitorId);
    setIsOpen(false);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const visitorId = getOrCreateVisitorId();
    
    await saveSurveyResponse({
      visitorId,
      ...answers,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });

    setIsSubmitting(false);
    setCurrentStep(4); // Show thank you step
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return answers.notificationFrequency !== "";
      case 1:
        return answers.notificationStyle !== "" && 
          (answers.notificationStyle !== "other" || answers.notificationStyleOther !== "");
      case 2:
        return answers.preferredTime !== "" &&
          (answers.preferredTime !== "custom" || answers.customTime !== "");
      case 3:
        return answers.motivationType !== "";
      default:
        return true;
    }
  };

  if (!isOpen) return null;

  // Thank you screen
  if (currentStep === 4) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Thank You!</h2>
          <p className="text-slate-400 mb-6">
            Your feedback helps us build a better app for everyone. We really appreciate you taking the time!
          </p>
          <Button
            onClick={() => setIsOpen(false)}
            className="w-full bg-emerald-500 hover:bg-emerald-600"
          >
            Continue to App
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center md:p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border-t md:border border-slate-700 rounded-t-2xl md:rounded-2xl w-full md:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-4 md:p-6 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <h2 className="text-lg md:text-xl font-bold text-white">Help Us Improve</h2>
            </div>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  step <= currentStep ? "bg-amber-500" : "bg-slate-700"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">Question {currentStep + 1} of 4</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 md:p-6">
          {/* Step 0: Notification Frequency */}
          {currentStep === 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Would you like to receive notifications about your challenges?
              </h3>
              <p className="text-sm text-slate-400">
                We want to help you stay on track with your goals.
              </p>
              
              <div className="space-y-2">
                {[
                  { value: "yes", label: "Yes, please!", emoji: "👍" },
                  { value: "several_times", label: "Yes, several times a day", emoji: "🔔" },
                  { value: "morning", label: "Only in the morning", emoji: "🌅" },
                  { value: "evening", label: "Only in the evening", emoji: "🌙" },
                  { value: "never", label: "Never, I prefer no notifications", emoji: "🔕" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAnswers({ ...answers, notificationFrequency: option.value })}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      answers.notificationFrequency === option.value
                        ? "bg-amber-500/20 border-amber-500 text-white"
                        : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-xl">{option.emoji}</span>
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Notification Style */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                What kind of notifications would you prefer?
              </h3>
              <p className="text-sm text-slate-400">
                Choose the style that would motivate you the most.
              </p>
              
              <div className="space-y-2">
                {[
                  { 
                    value: "simple_reminder", 
                    label: "Simple reminder", 
                    description: "Just remind me what I need to do",
                    emoji: "📝" 
                  },
                  { 
                    value: "friendly_character", 
                    label: "Friendly character", 
                    description: "A fun character that talks like a friend, gives kudos, and cheers me on",
                    emoji: "🤖" 
                  },
                  { 
                    value: "aggressive", 
                    label: "Aggressive motivator", 
                    description: "Someone who pushes hard and doesn't let me slack off",
                    emoji: "🔥" 
                  },
                  { 
                    value: "other", 
                    label: "Other", 
                    description: "I have a different idea",
                    emoji: "💭" 
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAnswers({ ...answers, notificationStyle: option.value })}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      answers.notificationStyle === option.value
                        ? "bg-amber-500/20 border-amber-500"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{option.emoji}</span>
                      <div>
                        <span className="font-medium text-white">{option.label}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {answers.notificationStyle === "other" && (
                <div className="mt-3">
                  <label className="text-sm text-slate-400 block mb-2">Tell us your idea:</label>
                  <textarea
                    value={answers.notificationStyleOther}
                    onChange={(e) => setAnswers({ ...answers, notificationStyleOther: e.target.value })}
                    placeholder="Describe your preferred notification style..."
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 2: Preferred Time */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                When is the best time to send you reminders?
              </h3>
              <p className="text-sm text-slate-400">
                We&apos;ll notify you when it works best for your schedule.
              </p>
              
              <div className="space-y-2">
                {[
                  { value: "morning", label: "Morning (7-9 AM)", emoji: "🌅" },
                  { value: "afternoon", label: "Afternoon (12-2 PM)", emoji: "☀️" },
                  { value: "evening", label: "Evening (6-8 PM)", emoji: "🌙" },
                  { value: "custom", label: "Custom time", emoji: "⏰" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAnswers({ ...answers, preferredTime: option.value })}
                    className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      answers.preferredTime === option.value
                        ? "bg-amber-500/20 border-amber-500 text-white"
                        : "bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-600"
                    }`}
                  >
                    <span className="text-xl">{option.emoji}</span>
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>

              {answers.preferredTime === "custom" && (
                <div className="mt-3">
                  <label className="text-sm text-slate-400 block mb-2">Select your preferred time:</label>
                  <input
                    type="time"
                    value={answers.customTime}
                    onChange={(e) => setAnswers({ ...answers, customTime: e.target.value })}
                    className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* Step 3: Motivation Type */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                What motivates you the most?
              </h3>
              <p className="text-sm text-slate-400">
                This helps us personalize your experience.
              </p>
              
              <div className="space-y-2">
                {[
                  { 
                    value: "streaks", 
                    label: "Keeping my streak alive", 
                    description: "I don't want to break my streak!",
                    emoji: "🔥" 
                  },
                  { 
                    value: "social_pressure", 
                    label: "Social accountability", 
                    description: "Knowing others can see my progress",
                    emoji: "👥" 
                  },
                  { 
                    value: "personal_goals", 
                    label: "Personal achievement", 
                    description: "Reaching my own goals matters most",
                    emoji: "🎯" 
                  },
                  { 
                    value: "competition", 
                    label: "Competition", 
                    description: "I want to be better than others",
                    emoji: "🏆" 
                  },
                  { 
                    value: "rewards", 
                    label: "Rewards & badges", 
                    description: "Earning badges and recognition",
                    emoji: "🏅" 
                  },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setAnswers({ ...answers, motivationType: option.value })}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      answers.motivationType === option.value
                        ? "bg-amber-500/20 border-amber-500"
                        : "bg-slate-800/50 border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{option.emoji}</span>
                      <div>
                        <span className="font-medium text-white">{option.label}</span>
                        <p className="text-xs text-slate-400 mt-0.5">{option.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 py-4 md:p-6 border-t border-slate-800 bg-slate-900/80">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex-1"
              >
                Back
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={!canProceed() || isSubmitting}
              className={`flex-1 ${
                currentStep === 3 
                  ? "bg-emerald-500 hover:bg-emerald-600" 
                  : "bg-amber-500 hover:bg-amber-600"
              }`}
            >
              {isSubmitting ? (
                "Submitting..."
              ) : currentStep === 3 ? (
                "Submit Feedback"
              ) : (
                "Next"
              )}
            </Button>
          </div>
          
          <button
            onClick={handleDismiss}
            className="w-full mt-3 text-sm text-slate-500 hover:text-slate-400 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

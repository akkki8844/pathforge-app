import { ExternalLink, X, MapPin, DollarSign, GraduationCap, Target, Trophy } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity } from "@/lib/activities";

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  priority: "High" | "Medium" | "Low";
  priorityExplanation: string;
  selectedMajor?: string;
}

export function ActivityDetailModal({
  activity,
  isOpen,
  onClose,
  priority,
  priorityExplanation,
  selectedMajor,
}: ActivityDetailModalProps) {
  if (!activity) return null;

  const priorityColors = {
    High: "bg-green-100 text-green-800 border-green-300",
    Medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Low: "bg-gray-100 text-gray-800 border-gray-300",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[61rem] max-h-[85dvh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <DialogTitle className="text-xl font-bold">{activity.name}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{activity.category}</Badge>
                <Badge variant="outline">{activity.type}</Badge>
                <Badge className={priorityColors[priority]}>{priority} Priority</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Key Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className={activity.cost === "Free" ? "text-green-600 font-medium" : ""}>
                {activity.cost}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-muted-foreground" />
              <span>{activity.difficulty}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>{activity.gradeSuitability}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{activity.countries.length === 0 ? "Global / Online" : activity.countries.slice(0, 2).join(", ")}</span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">About This Activity</h4>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {activity.detailedDescription}
            </p>
          </div>

          {/* Priority Explanation */}
          <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="h-4 w-4 text-accent" />
              <h4 className="font-semibold text-sm">Why {priority} Priority{selectedMajor ? ` for ${selectedMajor}` : ""}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{priorityExplanation}</p>
          </div>

          {/* Why Relevant */}
          {selectedMajor && activity.relevantMajors.includes(selectedMajor) && (
            <div>
              <h4 className="font-semibold mb-2">How It Fits Your Goals</h4>
              <p className="text-muted-foreground text-sm">{activity.whyRelevant}</p>
            </div>
          )}

          {/* Relevant Majors */}
          <div>
            <h4 className="font-semibold mb-2">Relevant Majors</h4>
            <div className="flex flex-wrap gap-2">
              {activity.relevantMajors.map((major) => (
                <Badge 
                  key={major} 
                  variant={major === selectedMajor ? "default" : "outline"}
                  className="text-xs"
                >
                  {major}
                </Badge>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button asChild className="flex-1">
              <a href={activity.learnMoreUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Learn More
              </a>
            </Button>
            {activity.applyUrl && (
              <Button asChild variant="secondary" className="flex-1">
                <a href={activity.applyUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Sign Up / Apply
                </a>
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

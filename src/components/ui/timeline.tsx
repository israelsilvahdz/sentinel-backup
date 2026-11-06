
import * as React from "react"

import { cn } from "@/lib/utils"

const Timeline = React.forwardRef<
  HTMLOListElement,
  React.ComponentProps<"ol">
>(({ className, ...props }, ref) => {
  return (
    <ol
      ref={ref}
      className={cn("flex flex-col", className)}
      {...props}
    />
  )
})
Timeline.displayName = "Timeline"

const TimelineItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => {
  return (
    <li
      ref={ref}
      className={cn(
        "relative flex flex-row gap-4 pt-4 first:pt-0",
        className
      )}
      {...props}
    />
  )
})
TimelineItem.displayName = "TimelineItem"

const TimelineConnector = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "absolute left-[0.45rem] top-[0.45rem] h-full w-px bg-muted-foreground/30",
        className
      )}
      {...props}
    />
  )
})
TimelineConnector.displayName = "TimelineConnector"

const TimelineHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex items-start gap-4", className)}
      {...props}
    />
  )
})
TimelineHeader.displayName = "TimelineHeader"

const TimelineIcon = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground [&>svg]:size-3",
        className
      )}
      {...props}
    />
  )
})
TimelineIcon.displayName = "TimelineIcon"

const TimelineTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentProps<"h2">
>(({ className, ...props }, ref) => {
  return (
    <h2
      ref={ref}
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  )
})
TimelineTitle.displayName = "TimelineTitle"

const TimelineBody = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col gap-2 pb-4 pl-8", className)}
      {...props}
    />
  )
})
TimelineBody.displayName = "TimelineBody"

export {
  Timeline,
  TimelineItem,
  TimelineConnector,
  TimelineHeader,
  TimelineIcon,
  TimelineTitle,
  TimelineBody,
}

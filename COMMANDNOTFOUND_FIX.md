# CommandNotFound Error Fix

## Problem
The bot was logging "CommandNotFound" errors in Render logs when other bots or users sent messages with prefixes like "lb", "lp", etc. These errors were cluttering the logs even though error handlers were in place.

## Root Cause
The bot uses command prefix "!" and listens to all messages. When it sees messages starting with other prefixes, it tries to parse them as commands, logs the error, and THEN the error handler catches it. The logging happens before the error handler runs.

## Solution Applied
Added a custom logging filter (`CommandNotFoundFilter`) that prevents CommandNotFound errors from being logged at all. This filter is applied to both:
- `discord` logger
- `discord.ext.commands` logger

The filter checks for these patterns in log messages:
- 'CommandNotFound'
- 'Command'
- 'is not found'

## Code Changes
File: `bot.py` (lines 13-29)
- Added `CommandNotFoundFilter` class
- Applied filter to discord loggers
- Maintains existing error handlers for actual error handling

## Next Steps
1. Redeploy on Render - the logs should now be clean
2. The CommandNotFound errors will still be caught by error handlers (silent)
3. Only real errors will appear in logs

## Testing
After redeploying, you should see:
- ✅ No more "Command 'lb' is not found" messages in logs
- ✅ Bot still responds to slash commands normally
- ✅ Clean, readable logs showing only important information

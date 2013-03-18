## Toolchain

The following tools are things that members of the team have found to be useful.

### Editors

#### SublimeText 2

Most of the team is using SublimeText 2 with various levels of customizations. Common plugins
include:

 * Package Control - Allows all other plugins to be installed
 * BracketHighlighter
 * Git
 * Handlebars.tmBundle
 * JsFormat
 * JsHint
 * PrettyJSON
 * Stylus
 * SublimeSaveOnBuild
 * TrailingSpaces

Useful config options:

```
{
  "bold_folder_labels": true,
  "draw_white_space": "all",
  "ensure_newline_at_eof_on_save": true,
  "file_exclude_patterns":
  [
    "*.tmproj",
    "*.sublime-workspace",
    "*.class",
    ".DS_Store"
  ],
  "folder_exclude_patterns":
  [
    ".svn",
    ".git",
    ".hg",
    "CVS",
    "node_modules"
  ],
  "highlight_line": true,
  "highlight_modified_tabs": true,
  "rulers":
  [
    100
  ],
  "tab_size": 2,
  "translate_tabs_to_spaces": true
}
```

For syncing your config across machines you can push all of your sublime configuration file to dropbox.
http://andrew.hedges.name/blog/2012/01/19/sublime-text-2-more-sublime-with-a-drop-of-dropbox

### SCM
#### Git Command Line

Your mileage may vary but by far the strongest git client out there.

Most common git commands

- `git checkout -b $newBranchName`
- `git stash`
- `git pull --rebase` (Warn do not do after a branch merge)

Ensure that your version of git has completions enabled (this might require [manual installation](https://gist.github.com/972430))

Customizing your bash prompt for git status is also very helpful:

This script whose origin has been lost will output the current branch and change status in your bash
profile.

```
function parse_git_branch {
  git branch --no-color 2> /dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/(\1)/'
}
function last_two_dirs {
  pwd |rev| awk -F / '{print $1,$2}' | rev | sed s_\ _/_
}

c_cyan=`tput setaf 6`
c_red=`tput setaf 1`
c_green=`tput setaf 2`
c_sgr0=`tput sgr0`

function proml {
  PS1='\h:$(last_two_dirs)\[$(branch_color)\]$(parse_git_branch)\[${c_sgr0}\] \u\$ '
}
function branch_color() {
  if git rev-parse --git-dir >/dev/null 2>&1
  then
    color=""
    git diff --quiet 2>/dev/null >&2
    if [[ $? -eq 0 ]]
    then
      color=${c_cyan}
    else
      color=${c_red}
    fi
  else
    return 0
  fi
  echo -ne $color
}

proml
```

#### Gitx

GUI frontend on various commit related git operations. The staging view is very valuable for doing
interactive commits and self-code review at commit time.

http://rowanj.github.com/gitx/

#### SourceTree

General git repository viewer. Helpful for viewing stashed changes that may have accumulated on your
local tree.

#### git-extras

A collection of useful tools for doing higher level git commands such as `delete-branch`. When
installing make sure that the command line tab completion tools to no error out as these are very
helpful.

https://github.com/visionmedia/git-extras

### Debugging and Optimizing

#### Charles
HTTP proxy and debugger with easy to use interface.

http://www.charlesproxy.com/

#### xScope
Inspect/measure mocks and final rendered pages.

http://iconfactory.com/software/xscope

#### Gradient Scanner
(Shameless plug) Extract CSS gradients from flatted mock images.

http://www.gradient-scanner.com/

#### ImageAlpha/ImageOptim
Image optimization tools. Performs both lossless and lossy compression of image assets.

http://pngmini.com/

### Documents
#### Dropbox
Easy way to backup remotely and share content across the team.

https://www.dropbox.com/

#### Evernote
Free notetaking service.

http://evernote.com/

#### MS Office
Because somethings you can't escape.

#### MS Remote Desktop Client
Again somethings you can not escape.

http://www.microsoft.com/mac/remote-desktop-client

### Communication
#### Adium
Chat over many protocols. Most common among the team are GTalk and AIM.

http://adium.im/

#### Propane
Team chat. Setup growl notifications and stay connected.

http://propaneapp.com/

#### Skype
Sometimes you need to use your voice. Horrible at IM.

http://beta.skype.com/en/

#### ScreenFlow
Generate screen casts for sharing content with coworkers or debugging transient behaviors.

http://www.telestream.net/screenflow/overview.htm

### System
#### Alfred
Search-based system launcher.

http://www.alfredapp.com/

#### Growl
Common notification system for Lumbar builds and Propane and others.

http://growl.info/

#### Divvy
Window position manager

http://mizage.com/divvy/

#### Stay
Utility which will restore your windows when you connect or disconnect a monitor.

http://cordlessdog.com/stay/

#### BetterTouchTool
Keyboard/mouse/touchpad gesture mapper.

http://www.boastr.de/

#### Cloud App
Dirt simple screenshot sharing app. Useful for sharing screenshots and other local content over
IM and email when attachments might not be supported or supported easily.

http://getcloudapp.com/

#### Homebrew
OSS package manager.

http://mxcl.github.com/homebrew/

#### nvm
Node version switcher. Easily allows for switching between different versions of node.

Current recommendations for the latest 0.8 node branch for running the development build stack as the
watch issues on the 0.8 branch seem to have been resolved.

https://github.com/creationix/nvm

# Working with git subtrees

Documentation: https://github.com/git/git/blob/master/contrib/subtree/git-subtree.txt

## Installation

Source: http://engineeredweb.com/blog/how-to-install-git-subtree/

### With Homebrew
If you used homebrew to install git then subtree, along with the rest of the git contrib items, was already placed on your system and can be installed. To install subtree:

1. Fire up a terminal and go to `/usr/local/share/git-core/contrib/subtree`.
2. Run `make` which will prepare subtree.
3. Run `make prefix=/usr/local/opt/git/ install`. The prefix is important because the default location the makefile knows about is not where it needs to be installed with homebrew.

### Git From Installer
If you downloaded and installed git using the installer from the git website there is a different method to installing git-subtree:

1. Since git contrib was not put on your system you'll need to checkout the git source. Don't worry about compiling or installing git. You just need access to the contrib director to install subtree (which is mostly shell scripts).
2. In a terminal go into the `git/contrib/subtree` directory.
3. Run `make to prepare subtree`.
4. Run `sudo make prefix=/usr install`. The prefix is important for it to be installed in the right location. Note, you need to use `sudo` to install this because of it's location on the system.
5. Remove the git source (unless you want to keep it around for another reason).

## Workflow

### Adding a subtree to the repository

From the repository's root directory run `git subtree add -P <prefix> <subtree repository url> master`
where `<prefix>` is a subdirectory where you want to pull in a subtree.

### Fetching subtree's history

Subtree's history is required to properly merge synthetic history created by `split` with subtree's repository history. If you are planning on pushing the changes upstream, after you have added a subtree as described above or cloned a repository that contains a subtree, you need to add and fetch subtree's repository as a remote:

    git remote add <name> <subtree repository url>
    git fetch <name>


### Branching, committing, sending pull requests
Git subtree is just a subdirectory in your project. So you treat it as any other subdirectory. You branch, commit and send pull requests for your root repository, no special handling for subtrees is required. It is better to make separate commits for the root repository and a subtree. So if you changes affect files in a subtree directory split the changes in those files into a separate commit. This way after pushing subtree commits upstream they will make sense in the subtree's repository context.

### Pushing upstream
After your pull request is merged, you should push the changes in the subtree to the subtree's own repository:

`git subtree push -P <prefix> <subtree repository> <branch>`

`<subtree repository>` may be an explicit url or a remote reference.

Branch `<branch>` in the remote subtree repository will be created if it doesn't exist. Then you can merge it or send a pull request as normal.

If a **fatal: bad object** error is seen fetch the remote url via `git fetch <name>`.



### Pulling from upstream
If you want to pull in all the changes in the subtree made in the remote subtree repository run

`git subtree pull -P <prefix> --squash <repository url> master`

`--squash` options collapses all the changes into one commit and helps keep history clean

### Git aliases
To avoid typing long subtree pull and push commands you can set up git aliases. Here is an example for phoenix-shared subtree:

    [alias]
      push-ph = subtree push -P components/phoenix git@github.com:walmartlabs/phoenix-shared.git
      pull-ph = subtree pull -P components/phoenix --squash git@github.com:walmartlabs/phoenix-shared.git master

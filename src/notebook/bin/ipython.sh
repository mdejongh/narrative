#!/usr/bin/env bash
#
# Script to run ipython from the src directory so that you don't have to install
# everything - intended solely for development work in the src repo
#
export IPYTHONSRC="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"/../../
export PYTHONPATH=$IPYTHONSRC/ipython:$IPYTHONSRC:$PYTHONPATH
export IPYTHONDIR=$IPYTHONSRC/notebook/ipython_profiles

cd $IPYTHONSRC/ipython
python -m IPython $* --NotebookManager.notebook_dir=~/.narrative --profile=narrative
cd -

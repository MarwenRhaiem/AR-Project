#!/bin/bash

# Répertoire local 
LOCAL_DIR="/var/www/project"

# Adresse IP de vm
REMOTE_HOST="98.66.232.248"

# user
REMOTE_USER="marwen"

# repertoire de projet dans vm
REMOTE_DIR="/var/www/root"

# Clé SSH pour la connexion à la machine virtuelle
SSH_KEY="~/.ssh/marwenvm_key.pem"

# Synchroniser les fichiers
rsync -avz --delete --exclude '.git' $LOCAL_DIR/ -e "ssh -i $SSH_KEY" $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR

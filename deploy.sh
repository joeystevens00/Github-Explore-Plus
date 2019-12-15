function ec() {
  ssh runpython@45.79.214.62 "$@"
}

function ec_file(){
    scp -r "$1" "runpython@45.79.214.62:$2"
}
remote_build_dir="/home/runpython/rghv"
function ec_build() {
  ec "cd $remote_build_dir && $@"
}
ec 'test -f $remote_build_dir || mkdir $remote_build_dir'
rsync -a --exclude '.pytest_cache/' ./ runpython@45.79.214.62:$remote_build_dir

ec_build "docker build -t github_explore_plus ."
ec_build "docker-compose up -d"

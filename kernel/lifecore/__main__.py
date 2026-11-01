import argparse
from .server import serve

parser = argparse.ArgumentParser()
parser.add_argument('--data-dir', required=True)
serve(parser.parse_args().data_dir)

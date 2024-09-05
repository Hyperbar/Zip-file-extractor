import zipfile
import os

def extract_archive(archivepath, dest_dir):
    """
    Extracts the contents of a zip archive to a specified destination directory.

    Args:
    archivepath (str): The path to the zip archive file.
    dest_dir (str): The path to the destination directory where files will be extracted.

    Raises:
    FileNotFoundError: If the archive file doesn't exist.
    zipfile.BadZipFile: If the file is not a valid zip archive.
    PermissionError: If there's no permission to write to the destination directory.
    """
    # Check if the archive file exists
    if not os.path.exists(archivepath):
        raise FileNotFoundError(f"The archive file {archivepath} does not exist.")

    # Check if the destination directory exists, create it if it doesn't
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)

    try:
        with zipfile.ZipFile(archivepath, "r") as archive:
            archive.extractall(dest_dir)
        print(f"Archive extracted successfully to {dest_dir}")
    except zipfile.BadZipFile:
        raise zipfile.BadZipFile(f"The file {archivepath} is not a valid zip archive.")
    except PermissionError:
        raise PermissionError(f"Permission denied to write to {dest_dir}")

if __name__ == "__main__":
    extract_archive("compressed.zip",
                    dest_dir=r"C:\Users\sztre\Desktop\dev\mes_cours\python\ardit\python mega course\app1_todo\pythonProject\Bonus\files")
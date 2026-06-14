from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('library', '0002_seatreservation_created_at_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='zone',
            name='layout_image',
            field=models.ImageField(blank=True, null=True, upload_to='zone_layouts/'),
        ),
        migrations.AddField(
            model_name='seat',
            name='x_position',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
        migrations.AddField(
            model_name='seat',
            name='y_position',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=5, null=True),
        ),
    ]
